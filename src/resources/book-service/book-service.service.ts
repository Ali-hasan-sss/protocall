import { forwardRef, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BOOKING_STATUS, PROJECT_STATUS, ROLE, SERVICE_STATUS, TAX_MASTER_STATUS, TAX_TYPE } from 'src/global/enums';
import { GeneralUtils } from 'src/utils/general-utils';
import { Between, FindManyOptions, FindOneOptions, In, IsNull, Not, Repository } from 'typeorm';
import { AddressService } from '../address/address.service';
import { Address } from '../address/entities/address.entity';
import { Service } from '../services/entities/service.entity';
import { ServicesService } from '../services/services.service';
import { UserSlotCalenderService } from '../user-slot-calender/user-slot-calender.service';
import { CreateBookServiceDto } from './dto/create-book-service.dto';
import { UpdateBookServiceDto } from './dto/update-book-service.dto';
import { BookService } from './entities/book-service.entity';
import * as moment from 'moment';
import { UserService } from '../user/user.service';
import { CompanyUserMappingService } from '../company-user-mapping/company-user-mapping.service';
import * as _ from 'underscore';
import { STATUS_CODES } from 'http';
import { PaymentService } from '../payment/payment.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionsService } from '../commissions/commissions.service';
import { PayoutsService } from '../payouts/payouts.service';
@Injectable()
export class BookServiceService {
  constructor(
    @InjectRepository(BookService) private bookServiceRepository: Repository<BookService>,
    @Inject(forwardRef(() => ServicesService)) private service: ServicesService,
    @Inject(AddressService) private readonly addressService: AddressService,
    @Inject(PaymentService) private readonly paymentService: PaymentService,
    @Inject(UserSlotCalenderService) private readonly userSlotCalenderService: UserSlotCalenderService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => CompanyUserMappingService)) private readonly companyUserMappingService: CompanyUserMappingService,
    @Inject(forwardRef(() => CommissionsService)) private readonly commissionsService: CommissionsService,
    @Inject(forwardRef(() => PayoutsService)) private readonly payoutsService: PayoutsService
  ) { }
  async create(createBookServiceDto: CreateBookServiceDto, userTokenData: any) {
    let { receiverEmail, receiverName, ...createBookService } = createBookServiceDto;

    let addressId = createBookService.address.id;
    // check if address object has id
    if (!addressId || addressId === null) {
      // create a new address
      addressId = (await this.addressService.addAddress(createBookService.address)).id;
    }

    let creationObject: Partial<BookService> = {
      orderUniqueId: GeneralUtils.generateRandomString(8),
      receiverEmail,
      receiverName,
      service: {
        id: createBookServiceDto.serviceId
      },
      address: {
        id: addressId
      },
      user: {
        id: userTokenData.appUserId
      },
      slotRef: JSON.stringify(createBookServiceDto.slots)
    }
    // get user Id
    let service = await this.service.findOne(createBookServiceDto.serviceId);
    let userId = service.user.id;
    // check if company
    if (service.user.role === ROLE.SERVICE_PROVIDER_COMPANY) {
      // fetch available team member
      let teamMembers = await this.companyUserMappingService.fetchTeamMembersBySlotRef(service.user.id, service.subCategories.map(e => e.id), createBookServiceDto.slots)
      if (!teamMembers.length) {
        throw new NotFoundException('Team members not found.')
      }
      userId = teamMembers[0].teamMember.id
    }
    // update user slot calender
    await this.userSlotCalenderService.updateBookedService(createBookServiceDto.slots, userId);
    // bookingDetails.status = BOOKING_STATUS.SCHEDULED;
    // creationObject.status = BOOKING_STATUS.SCHEDULED;
    // send payment intent of visiting charge
    let paymentIntent = await this.paymentService.createPaymentIntent(service.visitingCharges, 'Service Payment', {
      isService: true,
      isGrandTotal: false
    })
    creationObject.assignedToUser = userId;
    creationObject.intentSecret = paymentIntent.client_secret;
    await this.bookServiceRepository.insert(creationObject);
    const bookingObject = await this.bookServiceRepository.findOne({
      where: {
        orderUniqueId: creationObject.orderUniqueId
      },
      select: ['orderUniqueId', 'id']
    })
    return {
      ...bookingObject,
      clientSecret: paymentIntent.client_secret
    };
  }

  async rescheduleBooking(bookingId: number, slotRef: string) {
    try {
      // get booking details
      const bookingDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('bookService.assignedToUser', 'assignedToUser')
        .where({
          id: bookingId
        })
        .getOne()
      if (!bookingDetails) {
        throw new NotFoundException('Booking not found');
      }
      // scheduled 
      let newSlotRef = JSON.stringify(slotRef)
      bookingDetails.status = BOOKING_STATUS.SCHEDULED;
      let userId = bookingDetails.assignedToUser ? bookingDetails.assignedToUser.id : bookingDetails.service.user.id;
      await this.userSlotCalenderService.updateBookedService(slotRef, userId);
      if (bookingDetails.slotRef) {
        await this.userSlotCalenderService.cancelBookedService(JSON.parse(bookingDetails.slotRef), userId);
      }
      bookingDetails.slotRef = newSlotRef;
      return await this.bookServiceRepository.save(bookingDetails);
    } catch (err) {
      throw err;
    }
  }

  async save(entity) {
    return await this.bookServiceRepository.save(entity);
  }

  async cancelBooking(bookingId: number) {
    try {
      // get booking details
      let bookingDetails = await this.bookServiceRepository.findOne({
        where: {
          id: bookingId
        },
        relations: ['service', 'assignedToUser', 'service.user'],
        loadEagerRelations: false
      });
      if (!bookingDetails) {
        throw new NotFoundException('Booking not found');
      }
      // canceled 
      bookingDetails.status = BOOKING_STATUS.CANCELED;
      let userId = bookingDetails.assignedToUser ? bookingDetails.assignedToUser.id : bookingDetails.service.user.id;
      await this.userSlotCalenderService.cancelBookedService(JSON.parse(bookingDetails.slotRef), userId);
      return await this.bookServiceRepository.save(bookingDetails);
    } catch (err) {
      throw err;
    }
  }

  async fetchBookedServices(status = '', limit, offset, userTokenData) {
    try {
      // get service provider details with services that are booked     
      let whereClause: any = {}
      if (status) {
        whereClause = {
          status: status
        }
      }
      let bookCondition: [string, any] = ['service.fk_id_user=:userId', { userId: userTokenData.appUserId }]; // if not a company
      if (userTokenData.isTeamMember) {
        // if it's a company get company Id first and filter book service by fk_id_assigned_to_user
        // fetch company Id
        bookCondition = ['service.fk_id_user=:userId', { userId: userTokenData.companyId }];
        whereClause['assignedToUser'] = userTokenData.appUserId;
      }
      let count = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .andWhere(whereClause)
        .getCount()

      let bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('bookService.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'assignedToUserProfilePicId')
        .leftJoinAndSelect('assignedToUser.reviews', 'assignedToUserReviews')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('bookService.address', 'address')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('invoice.serviceStartPicture', 'serviceStartPicture')
        .leftJoinAndSelect('invoice.serviceEndPicture', 'serviceEndPicture')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=user.id')
        .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
        .andWhere(whereClause)
        .take(limit)
        .skip(offset)
        .getMany();

      // get reviews count
      for (let index = 0; index < bookedServiceDetails.length; index++) {
        const bookedServiceDetail = bookedServiceDetails[index];
        let paidAmount = bookedServiceDetail.service.visitingCharges;
        let pendingAmount = 0;
        bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
        bookedServiceDetail['paidAmount'] = paidAmount;
        bookedServiceDetail['pendingAmount'] = pendingAmount;
        if (bookedServiceDetail.assignedToUser) {
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          bookedServiceDetail.assignedToUser.reviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          let totalReviewCount = bookedServiceDetail.assignedToUser.reviews.length
          // getting an avg
          let avg = 0;
          if (bookedServiceDetail.assignedToUser.reviews && bookedServiceDetail.assignedToUser.reviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bookedServiceDetail.assignedToUser.reviews.length * 6)
          }
          bookedServiceDetail.assignedToUser['reviewInfo'] = {
            totalAvg: avg.toFixed(1),
            totalReviewCount: totalReviewCount
          }
        }
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        bookedServiceDetail.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          // @TODO calculate pending and paid amount;
        });
        let totalReviewCount = bookedServiceDetail.user.reviews.length
        // getting an avg
        let avg = 0.00;
        if (bookedServiceDetail.user.reviews && bookedServiceDetail.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (bookedServiceDetail.user.reviews.length * 4)
        }

        bookedServiceDetail.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
        bookedServiceDetails,
        count,
        totalCount: count,
        totalPageCount: count ? Math.ceil(count / (limit || 6)) : 0
      };

    } catch (err) {
      throw err;
    }
  }

  // service provider
  async fetchBookedServicesByDate(startDate, endDate, limit, offset, userTokenData) {
    try {
      // get service provider details with services that are booked
      let bookedServiceDetails;
      let count;
      let whereClause: any = {
        status: PROJECT_STATUS.COMPLETED
      }

      let bookCondition: [string, any] = ['service.fk_id_user=:userId AND bookService.created_at BETWEEN :startDate AND :endDate', { userId: userTokenData.appUserId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() }]; // if not a company
      if (userTokenData.isTeamMember) {
        // if it's a company get company Id first and filter book service by fk_id_assigned_to_user
        // fetch company Id
        bookCondition = ['service.fk_id_user=:userId AND bookService.created_at BETWEEN :startDate AND :endDate', { userId: userTokenData.companyId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() }];
        whereClause['assignedToUser'] = userTokenData.appUserId;
      }
      count = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .andWhere(whereClause)
        .getCount()

      bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('bookService.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('bookService.address', 'address')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('invoice.serviceStartPicture', 'serviceStartPicture')
        .leftJoinAndSelect('invoice.serviceEndPicture', 'serviceEndPicture')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=user.id')
        .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
        .andWhere(whereClause)
        .orderBy('bookService.created_at', 'ASC')
        .take(limit)
        .skip(offset)
        .getMany();

      let allBookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .andWhere(whereClause)
        .getMany();

      let totalEarned = 0;
      let totalEarnedAfterCommission = 0;
      allBookedServiceDetails.forEach((bS) => {
        totalEarned += bS.totalAmount;
        totalEarnedAfterCommission += bS.totalCommissionAmount;
      })
      // get reviews count
      for (let index = 0; index < bookedServiceDetails.length; index++) {
        const bookedServiceDetail = bookedServiceDetails[index];
        let paidAmount = bookedServiceDetail.service.visitingCharges;
        let pendingAmount = 0;
        bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
        bookedServiceDetail['paidAmount'] = paidAmount;
        bookedServiceDetail['pendingAmount'] = pendingAmount;
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        bookedServiceDetail.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          // @TODO calculate pending and paid amount;
        });
        let totalReviewCount = bookedServiceDetail.user.reviews.length
        // getting an avg
        let avg = 0.00;
        if (bookedServiceDetail.user.reviews && bookedServiceDetail.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (bookedServiceDetail.user.reviews.length * 4)
        }

        bookedServiceDetail.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
        data: bookedServiceDetails,
        amount: totalEarned,
        totalEarnedAfterCommission,
        count: count,
        totalCount: count || 0,
        totalPageCount: count ? Math.ceil(count / (limit || 6)) : 0
      };

    } catch (err) {
      throw err;
    }
  }

  async fetchTeamMemberServiceAnalytics(startDate, endDate, teamMemberIds, userTokenData) {
    try {
      // if it's a company get company Id first and filter book service by fk_id_assigned_to_user
      // fetch company Id
      const bookCondition: any = ['service.fk_id_user=:userId AND bookService.created_at BETWEEN :startDate AND :endDate', { userId: userTokenData.appUserId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() }];
      const whereClause = {
        assignedToUser: teamMemberIds.length ? In(teamMemberIds) : Not(IsNull())
      }
      const bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .andWhere(whereClause)
        .getMany();
      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let hired = 0;
      let totalEarned = 0;
      let successRatio = 0;
      // get reviews count
      for (let index = 0; index < bookedServiceDetails.length; index++) {
        let bookService = bookedServiceDetails[index];
        if (bookService.status === BOOKING_STATUS.COMPLETED) {
          totalEarned += bookService.service.totalEarned
          completed++;
        }
        if (bookService.status === BOOKING_STATUS.PAYMENT_PENDING) {
          pendingPayment += bookService.invoice.grandTotal;
          inProgress++;
        }
        if (bookService.status === BOOKING_STATUS.CANCELED) {
          cancelled++;
        }
        if (bookService.status === BOOKING_STATUS.SCHEDULED) {
          hired++;
        }
      }
      hired += inProgress + completed;
      successRatio = (cancelled / bookedServiceDetails.length) * 100;
      return { completed, pendingPayment, cancelled, totalEarned, hired, successRatio, inProgress };
    } catch (err) {
      throw err;
    }
  }

  async fetchServiceAnalytics(startDate, endDate, userTokenData) {
    try {
      let bookedServiceDetails: Array<BookService>;
      let whereClause: any = {}
      let bookCondition: [string, any] = ['service.fk_id_user=:userId AND bookService.created_at BETWEEN :startDate AND :endDate', { userId: userTokenData.appUserId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() }]; // if not a company
      if (userTokenData.isTeamMember) {
        // if it's a company get company Id first and filter book service by fk_id_assigned_to_user
        // fetch company Id
        bookCondition = ['service.fk_id_user=:userId AND bookService.created_at BETWEEN :startDate AND :endDate', { userId: userTokenData.companyId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() }];
        whereClause['assignedToUser'] = userTokenData.appUserId;
      }

      bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .andWhere(whereClause)
        .getMany();

      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let hired = 0;
      let totalEarned = 0;
      let successRatio = 0;
      // get reviews count
      for (let index = 0; index < bookedServiceDetails.length; index++) {
        let bookService = bookedServiceDetails[index];
        if (bookService.status === BOOKING_STATUS.COMPLETED) {
          totalEarned += bookService.totalCommissionAmount
          completed++;
        }
        if (bookService.status === BOOKING_STATUS.PAYMENT_PENDING) {
          pendingPayment += bookService.invoice.grandTotal;
          inProgress++;
        }
        if (bookService.status === BOOKING_STATUS.CANCELED) {
          cancelled++;
        }
        if (bookService.status === BOOKING_STATUS.SCHEDULED) {
          hired++;
        }
      }
      hired += inProgress + completed;
      // successRatio = (cancelled / bookedServiceDetails.length) * 100;
      successRatio = (completed / bookedServiceDetails.length) * 100;

      return { completed, pendingPayment, cancelled, totalEarned, hired, successRatio, inProgress };
    } catch (err) {
      throw err;
    }
  }

  async raiseInvoice(bookingId) {
    try {
      let bookingService = await this.bookServiceRepository.findOne({
        where: {
          id: bookingId
        }
      })
      if (!bookingService) {
        throw new NotFoundException('Booking not found.');
      }
      await this.bookServiceRepository.update({
        id: bookingId
      }, {
        status: BOOKING_STATUS.PAYMENT_PENDING
      })
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateBookStatusCompleted(intentSecret) {
    try {
      let bookService = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('bookService.user', 'clientUser')
        .leftJoinAndSelect('bookService.assignedToUser', 'assignedToUser')
        .andWhere('bookService.intent_secret=:intentSecret', { intentSecret })
        .getOne()
      if (!bookService) {
        throw new NotFoundException('Booking not found')
      }
      bookService.status = BOOKING_STATUS.COMPLETED;
      let totalHours = moment(bookService.invoice.serviceEndDate).diff(bookService.invoice.serviceStartDate, 'hours');
      bookService.service.user.totalHours += totalHours;
      // add payout
      // get commission for the user
      let serviceUserRole = bookService.service.user.role === ROLE.CLIENT ? bookService.service.user.secondaryRole : bookService.service.user.role;
      let commission = await this.commissionsService.calculateCommission(bookService.service.user.id, serviceUserRole);

      let totalAmountEarned = bookService.totalAmount;
      if (bookService.taxPercentage) {
        totalAmountEarned = bookService.totalAmount - ((parseInt(bookService.taxPercentage) / 100) * bookService.totalAmount);
      }

      // reduce commission
      if (commission) {
        totalAmountEarned = bookService.totalAmount - (commission.percentage / 100 * bookService.totalAmount);
      }
      // add to payout
      await this.payoutsService.create({
        madeByClient: bookService.totalAmount,
        commission: commission ? commission.percentage / 100 * bookService.totalAmount : 0,
        payableToSP: totalAmountEarned,
        netEarning: commission ? commission.percentage / 100 * bookService.totalAmount : 0,
        serviceId: bookService.service.id,
        taxAmount: bookService.taxPercentage ? ((parseInt(bookService.taxPercentage) / 100) * bookService.totalAmount) : 0,
        projectId: null,
        clientUserId: bookService.user.id,
        serviceProviderUserId: bookService.service.user.id,
        milestoneId: null,
        bookServiceId: bookService?.id
      })
      // create a notification for admin
      let adminId = await this.userService.findOne({
        where: {
          role: ROLE.ADMIN
        }
      })
      if (adminId) {
        await this.notificationsService.create({
          userId: adminId.id,
          role: ROLE.ADMIN,
          title: 'Payout raised',
          description: 'A New payout request has been received',
          serviceId: bookService.service.id + "",
          projectId: null,
          bookServiceId: bookService.id + "",
          config: {
            type: 'PROJECT'
          }
        })
      }
      bookService.service.user.totalEarned += totalAmountEarned;
      bookService.service.totalEarned += bookService.totalAmount;
      bookService.service.totalEarnedAfterCommission += totalAmountEarned
      bookService.user.totalSpent += bookService.totalAmount;
      bookService.totalCommissionAmount = totalAmountEarned;
      await this.service.save(bookService.service);
      await this.userService.save(bookService.user);
      await this.userService.save(bookService.service.user);
      // create a notification
      let assignUserId = bookService.assignedToUser ? bookService.assignedToUser.id : null;
      let userId = bookService.user.id;
      if (assignUserId) {
        // add notification to team member
        await this.notificationsService.create({
          userId: assignUserId,
          role: bookService.assignedToUser.role,
          title: 'Payment Completed for a Booking',
          description: 'The payment for your booked service is completed',
          serviceId: bookService.service.id + "",
          projectId: null,
          bookServiceId: bookService.id + "",
          config: {
            isTeamMember: true,
            id: bookService.id,
            status: bookService.status,
            type: 'SERVICE'
          }
        })
      }
      // add notification to the user
      await this.notificationsService.create({
        userId: userId,
        role: bookService.user.role,
        title: 'Payment Completed for a Booking',
        description: 'The payment for your booked service is completed',
        serviceId: bookService.service.id + "",
        projectId: null,
        bookServiceId: bookService.id + "",
        config: {
          isTeamMember: true,
          id: bookService.id,
          status: bookService.status,
          type: 'SERVICE'
        }
      })
      return await this.bookServiceRepository.save(bookService);
    } catch (err) {
      throw err;
    }
  }

  async removeBooking(clientSecret) {
    let bookingDetails = await this.bookServiceRepository.findOne({
      where: {
        intentSecret: clientSecret
      }
    })
    if (bookingDetails) {
      let userId = bookingDetails.assignedToUser ? bookingDetails.assignedToUser.id : bookingDetails.service.user.id;
      await this.userSlotCalenderService.cancelBookedService(JSON.parse(bookingDetails.slotRef), userId);
      return await this.bookServiceRepository.delete({
        id: bookingDetails.id
      })
    }
    return {
      success: false
    }
  }

  async removeBookingById(id) {
    try {
      let bookingDetails = await this.bookServiceRepository.findOne({
        where: {
          id
        }
      })
      if (bookingDetails) {
        let userId = bookingDetails.assignedToUser ? bookingDetails.assignedToUser.id : bookingDetails.service.user.id;
        await this.userSlotCalenderService.cancelBookedService(JSON.parse(bookingDetails.slotRef), userId);
        await this.bookServiceRepository.delete({ id: bookingDetails.id });
        return {
          success: true
        }
      }
      return {
        success: false
      }
    } catch (err) {
      throw err;
    }
  }

  async updateBookStatusPaymentPending(clientSecret) {
    try {
      return this.bookServiceRepository.update({
        intentSecret: clientSecret
      }, {
        status: BOOKING_STATUS.PAYMENT_PENDING,
        intentSecret: null
      })
    } catch (err) {
      throw err;
    }
  }

  async updateBookStatusScheduled(clientSecret) {
    try {
      const bookService = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('categoryMaster.taxMasters', 'taxMasters')
        .where({
          intentSecret: clientSecret
        })
        .getOne()
      if (bookService) {
        let taxMasters: Array<any> = [];
        if (bookService.service.subCategories[0].categoryMaster.taxMasters) {
          taxMasters = _.uniq(_.flatten(_.pluck(_.pluck(bookService.service.subCategories, 'categoryMaster'), 'taxMasters')), function (x) {
            return x.id;
          });
        }
        let serviceProvider = bookService.service.user;
        let appliedTax: any;
        let specificTaxes = taxMasters.filter(tax => { return tax.taxType === TAX_TYPE.SPECIFIC });

        if (specificTaxes.length) {
          appliedTax = specificTaxes.find((tax) => {
            let pZipCodes = JSON.parse(tax.zipCodes).map((p) => { return parseInt(p) });
            if (pZipCodes.indexOf(serviceProvider.postcode) !== -1 && tax.status === TAX_MASTER_STATUS.ACTIVE) {
              return tax;
            }
          })
        }

        if (!appliedTax) {
          let generalTaxes = taxMasters.filter(tax => { return tax.taxType === TAX_TYPE.GENERAL });
          appliedTax = generalTaxes.find((tax) => {
            if (tax.fromPostcode <= serviceProvider.postcode && tax.toPostcode >= serviceProvider.postcode && tax.status === TAX_MASTER_STATUS.ACTIVE) {
              return tax
            }
          })
        }

        await this.bookServiceRepository.update({
          id: bookService.id
        }, {
          status: BOOKING_STATUS.SCHEDULED,
          taxPercentage: appliedTax ? appliedTax.taxPercentage : 0,
          taxUniqueCode: appliedTax ? appliedTax.taxUniqueCode : null,
        })
        // create a notification
        let isCompany = bookService.service.user.role === ROLE.SERVICE_PROVIDER_COMPANY || false;
        let assignUserId = bookService.assignedToUser ? bookService.assignedToUser.id : null;
        let userId = bookService.service.user.id;
        if (isCompany && assignUserId) {
          // add notification to team member
          await this.notificationsService.create({
            userId: assignUserId,
            role: bookService.assignedToUser.role,
            title: 'Service Assigned by Company',
            description: 'You have been assigned a new service by the company',
            serviceId: bookService.service.id + "",
            projectId: null,
            bookServiceId: bookService.id + "",
            config: {
              isTeamMember: true,
              id: bookService.id,
              status: BOOKING_STATUS.SCHEDULED,
              type: 'SERVICE'
            }
          })
        }
        // add notification to the user
        await this.notificationsService.create({
          userId: userId,
          role: bookService.service.user.role === ROLE.CLIENT ? bookService.service.user.secondaryRole : bookService.service.user.role,
          title: 'Scheduled by Client',
          description: 'A service is scheduled by the client',
          serviceId: bookService.service.id + "",
          projectId: null,
          bookServiceId: bookService.id + "",
          config: {
            isTeamMember: false,
            id: bookService.id,
            status: BOOKING_STATUS.SCHEDULED,
            type: 'SERVICE'
          }
        })
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async completeBooking(bookingId) {
    try {
      let bookService = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('bookService.user', 'clientUser')
        .andWhere('bookService.id=:bookingId', { bookingId })
        .getOne()

      if (!bookService) {
        throw new NotFoundException('Booking not found')
      }

      if (!bookService.invoice) {
        throw new HttpException({
          status: HttpStatus.CONFLICT,
          message: 'Please raise an invoice before completing booking',
          error: 'Please raise an invoice before completing booking'
        }, HttpStatus.CONFLICT)
      }

      let totalSpent = bookService.invoice.grandTotal;

      let amountCalculated = bookService.invoice.grandTotal - bookService.invoice.visitingCharges;
      let paymentAmount = amountCalculated > 0
        ? parseFloat(parseFloat(amountCalculated?.toString()).toFixed(2))
        : 1;
      let paymentIntent = await this.paymentService.createPaymentIntent(
        paymentAmount,
        'Service Payment',
        {
          isService: true,
          isGrandTotal: true
        });

      bookService.totalAmount = totalSpent;
      bookService.intentSecret = paymentIntent.client_secret;
      await this.bookServiceRepository.save(bookService);
      return {
        clientSecret: paymentIntent.client_secret,
        orderUniqueId: bookService.orderUniqueId,
        amount: paymentAmount
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchBookedServiceById(bookingId: number, userTokenData) {
    try {
      // get service provider details with services that are booked
      let bookedServiceDetail;

      let whereClause: any = {}
      whereClause = {
        id: bookingId
      }

      let bookCondition: [string, any] = ['service.fk_id_user=:userId', { userId: userTokenData.appUserId }]; // if not a company
      if (userTokenData.isTeamMember) {
        // if it's a company get company Id first and filter book service by fk_id_assigned_to_user
        // fetch company Id
        bookCondition = ['service.fk_id_user=:userId', { userId: userTokenData.companyId }];
        whereClause['assignedToUser'] = userTokenData.appUserId;
      }

      bookedServiceDetail = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service', ...bookCondition)
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('bookService.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'assignedToUserProfilePicId')
        .leftJoinAndSelect('assignedToUser.reviews', 'assignedToUserReviews')
        .leftJoinAndSelect('bookService.address', 'address')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('invoice.serviceStartPicture', 'serviceStartPicture')
        .leftJoinAndSelect('invoice.serviceEndPicture', 'serviceEndPicture')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=user.id')
        .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
        .andWhere(whereClause)
        .getOne();

      if (!bookedServiceDetail) {
        throw new NotFoundException('Service not found');
      }
      // calculate service booked
      let servicesTaken = await this.count({
        where: {
          user: {
            id: bookedServiceDetail.user.id
          }
        }
      })
      // get reviews count
      let paidAmount = bookedServiceDetail.service.visitingCharges;
      let pendingAmount = 0;
      bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
      bookedServiceDetail['paidAmount'] = paidAmount;
      bookedServiceDetail['pendingAmount'] = pendingAmount;
      bookedServiceDetail.user['servicesTaken'] = servicesTaken;
      // calculate avg reviews
      let totalReview1 = 0;
      let totalReview2 = 0;
      let totalReview3 = 0;
      let totalReview4 = 0;
      let totalFiveStar = 0;
      let totalFourStar = 0;
      let totalThreeStar = 0;
      let totalTwoStar = 0;
      let totalOneStar = 0;
      if (bookedServiceDetail.assignedToUser) {
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        bookedServiceDetail.assignedToUser.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = bookedServiceDetail.assignedToUser.reviews.length
        // getting an avg
        let avg = 0;
        if (bookedServiceDetail.assignedToUser.reviews && bookedServiceDetail.assignedToUser.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bookedServiceDetail.assignedToUser.reviews.length * 6)
        }
        bookedServiceDetail.assignedToUser['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }
      bookedServiceDetail.user.reviews.forEach(review => {
        switch (Math.round(review.avg)) {
          case 5:
            totalFiveStar++
            break;
          case 4:
            totalFourStar++
            break;
          case 3:
            totalThreeStar++
            break;
          case 2:
            totalTwoStar++
            break;
          case 1:
            totalOneStar++
            break;
        }
        totalReview1 += review.review1
        totalReview2 += review.review2
        totalReview3 += review.review3
        totalReview4 += review.review4

        // @TODO calculate pending and paid amount;
      });
      let totalReviewCount = bookedServiceDetail.user.reviews.length
      // getting an avg
      let avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (bookedServiceDetail.user.reviews.length * 4)
      bookedServiceDetail.user['reviewInfo'] = {
        review1Avg: bookedServiceDetail.user.reviews.length ? (totalReview1 / bookedServiceDetail.user.reviews.length).toFixed(1) : 0,
        review2Avg: bookedServiceDetail.user.reviews.length ? (totalReview2 / bookedServiceDetail.user.reviews.length).toFixed(1) : 0,
        review3Avg: bookedServiceDetail.user.reviews.length ? (totalReview3 / bookedServiceDetail.user.reviews.length).toFixed(1) : 0,
        review4Avg: bookedServiceDetail.user.reviews.length ? (totalReview4 / bookedServiceDetail.user.reviews.length).toFixed(1) : 0,
        totalAvg: bookedServiceDetail.user.reviews.length ? avg.toFixed(1) : 0,
        totalReviewCount: totalReviewCount,
        totalFiveStar,
        totalFourStar,
        totalThreeStar,
        totalTwoStar,
        totalOneStar
      }
      return bookedServiceDetail;

    } catch (err) {
      throw err;
    }
  }

  async fetchBookedServicesForClient(status = '', limit, offset, userTokenData) {
    try {
      // get service provider details with services that are booked    
      let whereClause: any = {}
      if (status) {
        whereClause = {
          status: status,
          user: {
            id: userTokenData.appUserId
          }
        }
      }
      let count = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service')
        .andWhere(whereClause)
        .getRawAndEntities()

      let bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('bookService.address', 'address')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('invoice.serviceStartPicture', 'serviceStartPicture')
        .leftJoinAndSelect('invoice.serviceEndPicture', 'serviceEndPicture')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('serviceUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=serviceUser.id')
        .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
        .andWhere(whereClause)
        .take(limit)
        .skip(offset)
        .getRawAndEntities();

      let respBookings = bookedServiceDetails.entities
      // get reviews count
      for (let index = 0; index < respBookings.length; index++) {

        const bookedServiceDetail = respBookings[index];
        let paidAmount = bookedServiceDetail.service.visitingCharges;
        let pendingAmount = 0;
        bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
        bookedServiceDetail['paidAmount'] = paidAmount;
        bookedServiceDetail['pendingAmount'] = pendingAmount;
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;
        bookedServiceDetail.service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6

          // @TODO calculate pending and paid amount;
        });
        let totalReviewCount = bookedServiceDetail.service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (bookedServiceDetail.service.user.reviews && bookedServiceDetail.service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bookedServiceDetail.service.user.reviews.length * 6)
        }
        bookedServiceDetail.service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
        bookedServiceDetails: respBookings,
        count: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };

    } catch (err) {
      throw err;
    }
  }

  async fetchServiceAnalyticsForClient(startDate, endDate, userTokenData) {
    try {
      // get service provider details with services that are booked
      let bookedServiceDetails: Array<BookService>;
      let whereClause = {
        user: {
          id: userTokenData.appUserId
        },
        created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .andWhere(whereClause)
        .getMany();

      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let serviceBooked = 0;
      let totalSpent = 0;
      let cancelledRatio = 0.0;
      // get reviews count
      for (let index = 0; index < bookedServiceDetails.length; index++) {
        let bookService = bookedServiceDetails[index];
        if (bookService.status === BOOKING_STATUS.COMPLETED) {
          totalSpent += bookService.service.totalEarned;
          completed++;
        }
        if (bookService.status === BOOKING_STATUS.PAYMENT_PENDING) {
          pendingPayment += bookService.invoice.grandTotal;
          inProgress++;
        }
        if (bookService.status === BOOKING_STATUS.CANCELED) {
          cancelled++;
        }
        if (bookService.status === BOOKING_STATUS.SCHEDULED) {
          serviceBooked++;
        }
      }
      serviceBooked += inProgress + completed;
      cancelledRatio = (cancelled / bookedServiceDetails.length) * 100;
      return { completed, pendingPayment, cancelled, totalSpent, cancelledRatio, serviceBooked, inProgress };
    } catch (err) {
      throw err;
    }
  }

  async fetchServicesForClientByDate(startDate, endDate, limit, offset, userTokenData) {
    try {
      // get service provider details with services that are booked      
      let totalSpent = 0;
      let whereClause: any = {
        status: BOOKING_STATUS.COMPLETED,
        user: {
          id: userTokenData.appUserId
        }
      }
      let count = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service',
          'service.created_at BETWEEN :startDate AND :endDate',
          {
            startDate: moment(startDate).startOf('day').toDate(),
            endDate: moment(endDate).endOf('day').toDate()
          }
        )
        .andWhere(whereClause)
        .getRawAndEntities()

      let bookedServiceDetails = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service',
          'service.created_at BETWEEN :startDate AND :endDate',
          {
            startDate: moment(startDate).startOf('day').toDate(),
            endDate: moment(endDate).endOf('day').toDate()
          }
        )
        .leftJoinAndSelect('bookService.address', 'address')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoinAndSelect('invoice.serviceStartPicture', 'serviceStartPicture')
        .leftJoinAndSelect('invoice.serviceEndPicture', 'serviceEndPicture')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
        .leftJoinAndSelect('service.user', 'serviceUser')
        .leftJoinAndSelect('serviceUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=serviceUser.id')
        .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
        .andWhere(whereClause)
        .take(limit)
        .skip(offset)
        .getRawAndEntities();

      // get reviews count
      let respBookings = bookedServiceDetails.entities;
      count.entities.forEach(entity => {
        totalSpent += entity.totalAmount;
      })

      for (let index = 0; index < respBookings.length; index++) {

        const bookedServiceDetail = respBookings[index];
        let paidAmount = bookedServiceDetail.service.visitingCharges;
        let pendingAmount = 0;
        bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
        bookedServiceDetail['paidAmount'] = paidAmount;
        bookedServiceDetail['pendingAmount'] = pendingAmount;
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;
        bookedServiceDetail.service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6

          // @TODO calculate pending and paid amount;
        });
        let totalReviewCount = bookedServiceDetail.service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (bookedServiceDetail.service.user.reviews && bookedServiceDetail.service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bookedServiceDetail.service.user.reviews.length * 6)
        }
        bookedServiceDetail.service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
        data: respBookings,
        amount: totalSpent,
        count: count.entities.length || 0,
        totalCount: count.entities.length || 0,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };

    } catch (err) {
      throw err;
    }
  }

  async fetchBookedServicesByIdForClient(bookingId: number, userTokenData) {
    try {
      // get service provider details with services that are booked
      let bookedServiceDetail;
      bookedServiceDetail = await this.bookServiceRepository.createQueryBuilder('bookService')
        .innerJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('bookService.invoice', 'invoice')
        .leftJoin('invoice.serviceStartPicture', 'serviceStartPicture')
        .addSelect(['serviceStartPicture.id'])
        .leftJoin('invoice.serviceEndPicture', 'serviceEndPicture')
        .addSelect(['serviceEndPicture.id'])
        .leftJoin('bookService.address', 'address')
        .leftJoin('service.files', 'files')
        .leftJoin('service.subCategories', 'subCategories')
        .addSelect(['subCategories.name', 'subCategories.description'])
        .leftJoin('subCategories.categoryMaster', 'categoryMaster')
        .addSelect(['categoryMaster.name', 'categoryMaster.description', 'categoryMaster.faq'])
        .leftJoin('bookService.user', 'user')
        .addSelect(['user.role', 'user.firstName', 'user.lastName', 'user.id', 'user.email', 'user.countryCode', 'user.contactNumber', 'user.created_at'])
        .leftJoin('service.user', 'serviceUser')
        .addSelect(['serviceUser.role', 'serviceUser.firstName', 'serviceUser.lastName', 'serviceUser.id', 'serviceUser.email', 'serviceUser.countryCode', 'serviceUser.contactNumber', 'serviceUser.created_at', 'serviceUser.totalHours'])
        .leftJoin('serviceUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .addSelect(['reviews.review1', 'reviews.review2', 'reviews.review3', 'reviews.review4', 'reviews.review5', 'reviews.review5', 'reviews.review6', 'reviews.avg'])
        .leftJoin('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=serviceUser.id')
        .addSelect(['serviceReviews.review1', 'serviceReviews.review2', 'serviceReviews.review3', 'serviceReviews.review4', 'serviceReviews.review5', 'serviceReviews.review5', 'serviceReviews.review6', 'serviceReviews.avg'])
        .leftJoin('serviceUser.profilePicId', 'clientProfilePicId')
        .addSelect('clientProfilePicId.id')
        .leftJoin('user.profilePicId', 'profilePicId')
        .addSelect('profilePicId.id')
        .andWhere({
          id: bookingId,
          user: {
            id: userTokenData.appUserId
          }
        })
        .getOne();
      if (!bookedServiceDetail) {
        return new NotFoundException('Booked service not found!');
      }
      // calculate service booked
      let servicesTaken = await this.bookServiceRepository.createQueryBuilder('bookService')
        .where({
          user: {
            id: bookedServiceDetail.user.id
          }
        })
        .select('bookService.id')
        .getMany()
      // get reviews count
      let paidAmount = bookedServiceDetail.service.visitingCharges;
      let pendingAmount = 0;
      bookedServiceDetail['paidAmount'] = paidAmount;
      bookedServiceDetail['isReviewed'] = bookedServiceDetail.reviews && bookedServiceDetail.reviews.length ? true : false;
      bookedServiceDetail['pendingAmount'] = pendingAmount;
      bookedServiceDetail.user['servicesTaken'] = servicesTaken.length;
      bookedServiceDetail.service.user['totalServicesProvided'] = await this.service.getTotalNumberOfServicesProvided(bookedServiceDetail.service.user.id);
      // calculate avg reviews
      let totalReview1 = 0;
      let totalReview2 = 0;
      let totalReview3 = 0;
      let totalReview4 = 0;
      let totalReview5 = 0;
      let totalReview6 = 0;
      let totalFiveStar = 0;
      let totalFourStar = 0;
      let totalThreeStar = 0;
      let totalTwoStar = 0;
      let totalOneStar = 0;
      bookedServiceDetail.service.user.reviews.forEach(review => {
        switch (Math.round(review.avg)) {
          case 5:
            totalFiveStar++
            break;
          case 4:
            totalFourStar++
            break;
          case 3:
            totalThreeStar++
            break;
          case 2:
            totalTwoStar++
            break;
          case 1:
            totalOneStar++
            break;
        }
        totalReview1 += review.review1
        totalReview2 += review.review2
        totalReview3 += review.review3
        totalReview4 += review.review4
        totalReview5 += review.review5
        totalReview6 += review.review6

        // @TODO calculate pending and paid amount;
      });
      let totalReviewCount = bookedServiceDetail.service.user.reviews.length
      // getting an avg
      let avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bookedServiceDetail.service.user.reviews.length * 6)
      bookedServiceDetail.service.user['reviewInfo'] = {
        review1Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview1 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        review2Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview2 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        review3Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview3 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        review4Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview4 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        review5Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview5 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        review6Avg: bookedServiceDetail.service.user.reviews.length ? (totalReview6 / bookedServiceDetail.service.user.reviews.length).toFixed(1) : 0,
        totalAvg: bookedServiceDetail.service.user.reviews.length ? avg.toFixed(1) : 0,
        totalReviewCount: totalReviewCount,
        totalFiveStar,
        totalFourStar,
        totalThreeStar,
        totalTwoStar,
        totalOneStar
      }
      return bookedServiceDetail;

    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async countByServiceId(serviceId, statusCondition) {
    try {
      let serviceCount = await this.bookServiceRepository.createQueryBuilder('book-service')
        .where({
          service: {
            id: serviceId
          },
          status: statusCondition
        })
        .select('id')
        .getMany()
      return serviceCount.length
    } catch (err) {
      throw err;
    }
  }

  async findAll(options: FindManyOptions<BookService>) {
    return await this.bookServiceRepository.find(options);
  }

  async findOne(options: FindOneOptions<BookService>) {
    return await this.bookServiceRepository.findOne(options);
  }

  async update(id: number, updateBookServiceDto: any) {
    return await this.bookServiceRepository.update({
      id: id
    }, updateBookServiceDto)
  }

  async count(options: FindManyOptions<BookService>) {
    try {
      return await this.bookServiceRepository.count(options)
    } catch (err) {
      throw err;
    }
  }


  async fetchBookedServiceIdsBySubcategories(startDate, endDate, subCategoryIds: Array<number>) {
    try {
      const bookServiceQuery = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .andWhere('subCategories.id IN (:subCategoryIds)', { subCategoryIds: subCategoryIds })
        .where({
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()),
        })
        .andWhere({
          status: BOOKING_STATUS.COMPLETED
        })
        .getMany()

      return _.pluck(_.pluck(bookServiceQuery, 'service'), 'id');
    } catch (err) {
      throw err;
    }
  }

  async totalBookedServiceCount(startDate, endDate, userId, subCategoryIds) {
    try {
      const bookServiceQuery = this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .where({
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
        })
        .andWhere({
          status: Not(BOOKING_STATUS.VISITING_CHARGES_PENDING)
        })
      if (userId) {
        bookServiceQuery.andWhere('user.id=:userId', { userId })
      }
      if (subCategoryIds.length) {
        bookServiceQuery.andWhere('subCategories.id IN (:subCategoryIds)', { subCategoryIds: subCategoryIds })
      }

      let totalBookedServiceCount = await bookServiceQuery.clone().getCount()

      let totalCompletedBookedService = await bookServiceQuery.clone().andWhere({
        status: BOOKING_STATUS.COMPLETED
      }).getCount()

      let totalScheduledBookedService = await bookServiceQuery.clone().andWhere({
        status: BOOKING_STATUS.SCHEDULED
      }).getCount()

      let totalPendingBookedService = await bookServiceQuery.clone().andWhere({
        status: BOOKING_STATUS.PAYMENT_PENDING
      }).getCount()

      let bookServices = await bookServiceQuery.clone().andWhere({
        status: BOOKING_STATUS.COMPLETED
      }).getMany()

      let totalValue = bookServices.map(b => { return b.totalAmount }).reduce((a, b) => { return a + b }, 0)

      return {
        totalValue,
        totalBookedServiceCount,
        totalCompletedBookedService,
        totalScheduledBookedService,
        totalPendingBookedService
      }
    } catch (err) {
      throw err;
    }
  }
  async fetchAllBookedService(status, searchString, startDate, endDate, limit, offset,orderKey, orderSeq: 'DESC' | 'ASC') {
    try {
      let searchWhere = '1=1';
      let where: any = {
        status: status
      }
      if (status == "ALL") {
        where = {
          status: Not(BOOKING_STATUS.VISITING_CHARGES_PENDING)
        }
      }
      if (startDate && endDate) {
        where['created_at'] = Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      if (searchString !== '' && searchString !== undefined) {
        searchWhere = `user.first_name LIKE '%${searchString}%' OR user.last_name LIKE '%${searchString}%' OR service.headline LIKE '%${searchString}%'`
      }

      orderSeq = orderSeq || 'DESC'
      orderKey = orderKey || 'created_at'

      // fetching all the projects
      let bookedServices = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.user', 'user')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'createdByUser')
        .where(where)
        .andWhere(searchWhere)
        .take(limit)
        .skip(offset)
        .orderBy(`bookService.${orderKey}`, `${orderSeq}`)
        // .orderBy('bookService.created_at', 'DESC')
        .getManyAndCount()
      return {
        bookedServices: bookedServices[0],
        totalCount: bookedServices[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async assignTeamMember(id, userId, userTokenData) {
    try {
      // get service
      let bookServiceDetails = await this.bookServiceRepository.findOne({
        where: {
          id: id
        },
        relations: ['assignedToUser', 'service']
      })

      // check if service is already assigned to a team member
      if (bookServiceDetails.assignedToUser) {
        // cancel his slot 
        await this.userSlotCalenderService.cancelBookedService(JSON.parse(bookServiceDetails.slotRef), bookServiceDetails.assignedToUser.id);
      }
      // book slot of the user
      await this.userSlotCalenderService.updateBookedService(JSON.parse(bookServiceDetails.slotRef), userId);

      // assign it to user
      await this.bookServiceRepository.update({
        id: id
      }, {
        assignedToUser: {
          id: userId
        }
      })
      // deleting the notification 
      await this.notificationsService.remove({
        user: {
          id: bookServiceDetails.assignedToUser.id
        },
        service: {
          id: bookServiceDetails.id
        }
      })
      // adding the notification 
      await this.notificationsService.create({
        userId: userId,
        role: bookServiceDetails.user.role,
        title: 'Service Assigned by Company',
        description: 'You have been assigned a new service by the company',
        serviceId: bookServiceDetails.service.id + "",
        projectId: null,
        bookServiceId: bookServiceDetails.id + "",
        config: {
          isTeamMember: true,
          id: bookServiceDetails.id,
          status: bookServiceDetails.status,
          type: 'SERVICE'
        }
      })
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateClientChatCount(id: number, chatCount: number, sendNotification: Boolean) {
    try {
      let bookService = await this.bookServiceRepository.findOne({
        where: {
          id: id
        },
        relations: ['service', 'user']
      })
      await this.bookServiceRepository.update({
        id: id
      }, {
        unreadChatCountClient: chatCount === 0 ? 0 : bookService.unreadChatCountClient + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: bookService.user.id,
          role: bookService.user.role === ROLE.CLIENT ? bookService.user.role : bookService.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: bookService.service.id + "",
          projectId: null,
          bookServiceId: bookService.id + "",
          config: {
            isTeamMember: false,
            id: bookService.id,
            status: bookService.status,
            type: 'SERVICE'
          }
        })
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateProviderChatCount(id: number, chatCount: number, sendNotification: Boolean) {
    try {
      let bookService = await this.bookServiceRepository.findOne({
        where: {
          id: id
        },
        relations: ['service', 'service.user']
      })
      await this.bookServiceRepository.update({
        id: id
      }, {
        unreadChatCountProvider: chatCount === 0 ? 0 : bookService.unreadChatCountProvider + chatCount
      })

      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: bookService.service.user.id,
          role: bookService.service.user.role !== ROLE.CLIENT ? bookService.service.user.role : bookService.service.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: bookService.service.id + "",
          projectId: null,
          bookServiceId: bookService.id + "",
          config: {
            isTeamMember: false,
            id: bookService.id,
            status: bookService.status,
            type: 'SERVICE'
          }
        })
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchBookingByUID(uoid: string, userTokenData) {
    try {
      const bookedServiceDetail = await this.bookServiceRepository.createQueryBuilder('bookService')
        .where({
          orderUniqueId: uoid,
        })
        .getOne()
      if (!bookedServiceDetail) {
        throw new NotFoundException('Booking not found.')
      }
      return bookedServiceDetail;
    } catch (err) {
      throw err;
    }
  }

  async sendReminder(id) {
    try {
      let bookedServiceDetail = await this.bookServiceRepository.findOne({
        where: {
          id: id
        }
      })
      if (!bookedServiceDetail) {
        throw new NotFoundException('Booking not found.')
      }
      let userId = bookedServiceDetail.user.id;
      if (userId) {
        const notification = await this.notificationsService.findOne({
          where: {
            title: 'Payment Reminder',
            user: {
              id: userId
            },
            bookService: {
              id: bookedServiceDetail.id
            },
            isRead: false
          }
        })

        if (notification && moment().diff(notification.created_at, 'hours') < 12) {
          const calculateTime = 12 - moment().diff(notification.created_at, 'hours');
          const timeRemaining = calculateTime < 1 ? 1 : calculateTime;
          return {
            message: `Reminder already sent. You can send next reminder in ${timeRemaining} hour(s).`
          }
        }

        if (notification && moment().diff(notification.created_at, 'hours') >= 12) {
          await this.notificationsService.deleteNotification(notification.id)
        }

        await this.notificationsService.create({
          userId: userId,
          role: bookedServiceDetail.user.role,
          title: 'Payment Reminder',
          description: 'The payment for your booked service needs to be completed',
          serviceId: bookedServiceDetail.service.id + "",
          projectId: null,
          bookServiceId: bookedServiceDetail.id + "",
          config: {
            isTeamMember: false,
            id: bookedServiceDetail.id,
            status: bookedServiceDetail.status,
            type: 'SERVICE'
          }
        })
        return {
          message: "Reminder sent successfully"
        }
      }
      return {
        message: "Failed to send reminder"
      }
    } catch (error) {
      throw error;
    }
  }

  async getTotalBookedServiceCount(userId) {
    try {
      const totalCompletedBookedService = await this.bookServiceRepository.createQueryBuilder('bookService')
        .leftJoinAndSelect('bookService.service', 'service')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .where('user.id=:userId', { userId })
        .andWhere({
          status: BOOKING_STATUS.COMPLETED
        }).getCount();

      return {
        totalCompletedBookedService: totalCompletedBookedService || 0
      }
    } catch (error) {
      throw error;
    }
  }

  // get(BookServiceService).generateFakeData(5)
  async generateFakeData(number) {
    try {
      // get users 
      let users = await this.userService.findAll({
        where: {
          role: ROLE.CLIENT
        }
      })

      for (let index = 0; index < users.length; index++) {
        const user = users[index];

      }
    } catch (err) {
      throw err;
    }
  }
  remove(id: number) {
    return `This action removes a #${id} bookService`;
  }
}
