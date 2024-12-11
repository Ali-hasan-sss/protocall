import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { PROJECT_STATUS, ROLE, TAX_MASTER_STATUS, TAX_TYPE } from 'src/global/enums';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectService } from '../project/project.service';
import { Review } from '../review/entities/review.entity';
import { ReviewService } from '../review/review.service';
import { User } from '../user/entities/user.entity';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { Bid } from './entities/bid.entity';
import * as _ from 'underscore';
const haversine = require('haversine')

@Injectable()
export class BidService {
  constructor(
    @InjectRepository(Bid) private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => ProjectService)) private projectService: ProjectService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
  ) { }
  async create(createBidDto: CreateBidDto, userTokenData: any) {
    let { projectId, ...createObj } = createBidDto;
    let createInstance = await this.bidRepository.create({
      ...createBidDto,
      user: {
        id: userTokenData.appUserId
      },
      project: {
        id: projectId
      }
      // create notification
    })
    let project = await this.projectService.findOne({
      where: {
        id: projectId
      },
      relations: ['user']
    })
    let serviceProvider = await this.userRepository.findOne({ where: { id: userTokenData.appUserId } })
    let clientLatLng = {
      latitude: project.user.lat,
      longitude: project.user.lng
    };
    let serviceProviderLatLng = {
      latitude: serviceProvider.lat,
      longitude: serviceProvider.lng
    }
    const values = [...Object.values(clientLatLng), ...Object.values(serviceProviderLatLng)];
    if (!values.some((currentValue) => currentValue === null)) {
      createInstance.bidderDistance = haversine(clientLatLng, serviceProviderLatLng, 'mile');
    }
    // notification to client
    await this.notificationsService.create({
      userId: project.user.id,
      role: ROLE.CLIENT,
      title: 'Bid Received',
      description: 'You have received a new bid for your project',
      serviceId: null,
      projectId: project.id + '',
      config: {
        isTeamMember: true,
        id: project.id,
        status: project.status,
        type: 'PROJECT'
      }
    })
    return await this.bidRepository.save(createInstance);
  }

  async findAll(options: FindManyOptions<Bid>) {
    return await this.bidRepository.find(options);
  }

  async findOne(options: FindOneOptions<Bid>) {
    return await this.bidRepository.findOne(options);
  }

  async updateClientChatCount(id: number, chatCount: number, sendNotification: Boolean) {
    try {
      let bid = await this.bidRepository.findOne({
        where: {
          id: id
        },
        relations: ['project', 'project.user']
      })
      await this.bidRepository.update({
        id: id
      }, {
        unreadChatCountClient: chatCount === 0 ? 0 : bid.unreadChatCountClient + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: bid.project.user.id,
          role: bid.project.user.role === ROLE.CLIENT ? bid.project.user.role : bid.project.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: bid.project.id,
          config: {
            isTeamMember: false,
            id: bid.project.id,
            type: 'PROJECT'
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
      let bid = await this.bidRepository.findOne({
        where: {
          id: id
        },
        relations: ['user', 'project', 'project.user']
      })
      await this.bidRepository.update({
        id: id
      }, {
        unreadChatCountProvider: chatCount === 0 ? 0 : bid.unreadChatCountProvider + chatCount,
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: bid.user.id,
          role: bid.user.role !== ROLE.CLIENT ? bid.user.role : bid.user.secondaryRole,
          title: `Your bid has been shortlisted by ${bid.project.user.firstName} ${bid.project.user.lastName}`,
          description: `Your bid has been shortlisted by ${bid.project.user.firstName} ${bid.project.user.lastName}`,
          serviceId: null,
          projectId: bid.project.id,
          config: {
            isTeamMember: false,
            id: bid.project.id,
            type: 'PROJECT'
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

  async getProjectIds(userId) {
    try {
      let bids = await this.bidRepository.find({
        where: {
          user: {
            id: userId
          },
          isApproved: true
        },
        relations: ['project']
      })
      return bids.map(bid => { return bid.project.id })
    } catch (err) {
      throw err;
    }
  }

  async findBidsByUserId(onlyShortListed, limit, offset, userTokenData) {
    try {
      let andWhere = '1=1';
      let userCondition = `bid.fk_id_user=${userTokenData.appUserId}`
      if (userTokenData.isTeamMember) {
        userCondition = `bid.fk_id_assigned_to_user=${userTokenData.appUserId}`
      }
      const statusCheckArray = [`'${PROJECT_STATUS.COMPLETED}'`, `'${PROJECT_STATUS.CANCEL}'`, `'${PROJECT_STATUS.IN_PROGRESS}'`];

      let bids = await this.bidRepository.createQueryBuilder('bid')
        .innerJoinAndSelect('bid.user', 'user', userCondition)
        .leftJoinAndSelect('bid.project', 'project')
        .leftJoinAndSelect('bid.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'assignedToUserProfilePicId')
        .leftJoinAndSelect('project.user', 'clientUser')
        .leftJoinAndSelect('clientUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('clientUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .andWhere(
          onlyShortListed ? {
            isApproved: false,
            isShortListed: true
          } : {
            isApproved: false
          })
        .andWhere(`project.status NOT IN (${statusCheckArray.join(',')})`)
        .andWhere(andWhere)
        .take(limit)
        .skip(offset)
        .getManyAndCount()

      let response = [];
      for (let index = 0; index < bids[0].length; index++) {
        const bid = bids[0][index];
        bid.project = this.projectService.calculateProjectExtraFields(bid.project)
        bid.project.user['reviewInfo'] = await this.calculateTotalAvg(bid.project.user.id, ROLE.CLIENT, '1=1')
        response.push(bid);
      }
      return {
        totalCount: bids[1],
        bids: response,
        totalPageCount: bids[1] ? Math.ceil(bids[1] / (limit || 6)) : 0
      };
    } catch (error) {
      throw error
    }
  }

  async findByUserId(isApproved, isShortListed, limit, offset, userTokenData) {
    try {
      let andWhere = '1=1';
      let statusCheckArray = [`'${PROJECT_STATUS.COMPLETED}'`, `'${PROJECT_STATUS.CANCEL}'`]
      if (!isApproved) {
        statusCheckArray = [`'${PROJECT_STATUS.COMPLETED}'`, `'${PROJECT_STATUS.CANCEL}'`, `'${PROJECT_STATUS.IN_PROGRESS}'`]
      }
      let userCondition = `bid.fk_id_user=${userTokenData.appUserId}`
      if (userTokenData.isTeamMember) {
        userCondition = `bid.fk_id_assigned_to_user=${userTokenData.appUserId}`
      }
      let where: any = {
        isApproved: isApproved,
        isShortListed: isShortListed
      }
      if (!isShortListed && isApproved) {
        where = {}
      }
      let bids = await this.bidRepository.createQueryBuilder('bid')
        .innerJoinAndSelect('bid.user', 'user', userCondition)
        .leftJoinAndSelect('bid.project', 'project')
        .leftJoinAndSelect('bid.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'assignedToUserProfilePicId')
        .leftJoinAndSelect('project.user', 'clientUser')
        .leftJoinAndSelect('clientUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('clientUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .andWhere(where)
        .andWhere(`project.status NOT IN (${statusCheckArray.join(',')})`)
        .andWhere(andWhere)
        .take(limit)
        .skip(offset)
        .getManyAndCount()

      let response = [];
      for (let index = 0; index < bids[0].length; index++) {
        const bid = bids[0][index];
        bid.project = this.projectService.calculateProjectExtraFields(bid.project)
        bid.project.user['reviewInfo'] = await this.calculateTotalAvg(bid.project.user.id, ROLE.CLIENT, '1=1')
        response.push(bid);
      }
      return {
        totalCount: bids[1],
        bids: response,
        totalPageCount: bids[1] ? Math.ceil(bids[1] / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async calculateTotalAvg(userId, role, andWhereClause) {
    try {
      let userReviews = await this.reviewRepository.createQueryBuilder('review')
        .where({
          user: {
            id: userId
          },
          role: role
        })
        .andWhere(andWhereClause)
        .getMany()

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

      userReviews.forEach(review => {
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
        totalReview5 += review.review5 || 0
        totalReview6 += review.review6 || 0
      });
      let totalReviewCount = userReviews.length
      // getting an avg
      let avg = 0;
      if (role === ROLE.CLIENT) {
        avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (userReviews.length * 4)
      } else {
        avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (userReviews.length * 6)
      }
      let reviewInfo = {
        review1Avg: userReviews.length ? (totalReview1 / userReviews.length).toFixed(1) : 0,
        review2Avg: userReviews.length ? (totalReview2 / userReviews.length).toFixed(1) : 0,
        review3Avg: userReviews.length ? (totalReview3 / userReviews.length).toFixed(1) : 0,
        review4Avg: userReviews.length ? (totalReview4 / userReviews.length).toFixed(1) : 0,
        review5Avg: userReviews.length ? (totalReview5 / userReviews.length).toFixed(1) : 0,
        review6Avg: userReviews.length ? (totalReview6 / userReviews.length).toFixed(1) : 0,
        totalAvg: userReviews.length ? avg.toFixed(1) : 0,
        totalReviewCount: totalReviewCount,
        totalFiveStar,
        totalFourStar,
        totalThreeStar,
        totalTwoStar,
        totalOneStar
      }
      return reviewInfo;
    } catch (err) {
      throw err;
    }
  }

  async fetchByProjectId(projectId, isShortlisted, limit, offset, userTokenData) {
    try {
      let bids = await this.bidRepository.createQueryBuilder('bid')
        .innerJoinAndSelect('bid.project', 'project', 'bid.fk_id_project=:projectId', {
          projectId: projectId
        })
        .andWhere(isShortlisted
          ? {
            isShortListed: true
          } : {})
        .leftJoinAndSelect('bid.user', 'bidUser')
        .leftJoinAndSelect('bidUser.reviews', 'bidUserReviews', 'bidUserReviews.role=:isProvider', {
          isProvider: ROLE.SERVICE_PROVIDER
        })
        .leftJoinAndSelect('bidUser.profilePicId', 'bidUserProfilePicId')
        .leftJoinAndSelect('bid.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.reviews', 'assignedToUserReviews')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:isClient', {
          isClient: ROLE.CLIENT
        })
        .limit(limit)
        .offset(offset)
        .getManyAndCount()

      for (let index = 0; index < bids[0].length; index++) {
        const bid = bids[0][index];
        bid.user['totalProjects'] = await this.projectService.countUserProjects(bid.user.id)
        if (bid.assignedToUser) {
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          bid.assignedToUser.reviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          let totalReviewCount = bid.assignedToUser.reviews.length
          // getting an avg
          let avg = 0;
          if (bid.assignedToUser.reviews && bid.assignedToUser.reviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bid.assignedToUser.reviews.length * 6)
          }
          bid.assignedToUser['reviewInfo'] = {
            totalAvg: avg.toFixed(1),
            totalReviewCount: totalReviewCount
          }
        }
        if (bid.user.reviews) {
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          bid.user.reviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          let totalReviewCount = bid.user.reviews.length
          // getting an avg
          let avg = 0;
          if (bid.user.reviews && bid.user.reviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (bid.user.reviews.length * 6)
          }
          bid.user['reviewInfo'] = {
            totalAvg: avg.toFixed(1),
            totalReviewCount: totalReviewCount
          }
        }
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let reviewLength = 0
        bid.project.user.reviews.forEach(review => {
          if (review.role === ROLE.CLIENT) {
            reviewLength++
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
          }
        });
        let totalReviewCount = reviewLength
        // getting an avg
        let avg = 0;
        if (bid.project.user.reviews && reviewLength) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (reviewLength * 4)
        }
        bid.project.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      let project = await this.projectService.findOne({
        where: {
          id: projectId
        }
      });

      return {
        bids: bids[0],
        totalCount: bids[1],
        biddingEndDate: (project && project?.biddingEndDate)
          ? project?.biddingEndDate
          : null
      };
    } catch (err) {
      throw err;
    }
  }

  async findById(id: number) {
    try {
      let bid = await this.bidRepository.findOne({
        where: {
          id: id
        },
        relations: ['project']
      });

      if (bid.user.id) {
        bid.user['totalProjects'] = await this.projectService.countUserProjects(bid.user.id);
        let userReviews = await this.reviewRepository.createQueryBuilder('review')
          .where({
            user: {
              id: bid.user.id
            },
            role: ROLE.SERVICE_PROVIDER
          })
          .getMany();
        let avg = 0;
        let totalReviewCount = 0;

        if (userReviews && userReviews.length) {
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          userReviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          totalReviewCount = userReviews.length
          // getting an avg

          if (userReviews && userReviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (userReviews.length * 6)
          }
        }
        bid.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }
      return bid;
    } catch (err) {
      throw err;
    }
  }

  async count(options: FindManyOptions<Bid>) {
    try {
      return this.bidRepository.count(options);
    } catch (err) {
      throw err;
    }
  }

  async getAssignedUser(projectId) {
    try {
      return await this.bidRepository.findOne({
        where: {
          project: {
            id: projectId
          },
          isApproved: true
        },
        relations: ['assignedToUser']
      })
    } catch (err) {
      throw err;
    }
  }
  async update(id: number, updateBidDto: UpdateBidDto) {
    let approvedDate = null;
    let bidDetails = await this.bidRepository.findOne({ where: { id: id }, relations: ['user', 'project', 'project.user', 'project.subCategories', 'project.subCategories.categoryMaster', 'project.subCategories.categoryMaster.taxMasters'] });
    if (updateBidDto.isApproved) {
      let taxMasters = _.uniq((_.flatten(_.pluck(_.pluck(bidDetails.project.subCategories, 'categoryMaster'), 'taxMasters'))), (x) => { return x.id });
      let serviceProvider = bidDetails.user;
      let specificTaxes = taxMasters.filter(tax => { return tax.taxType === TAX_TYPE.SPECIFIC });
      let appliedTax: any;
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
      // create approved notification
      await this.notificationsService.create({
        userId: bidDetails.user.id,
        role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
        title: `Your bid has been approved by ${bidDetails.project.user.firstName} ${bidDetails.project.user.lastName}`,
        description: `Your bid has been approved by ${bidDetails.project.user.firstName} ${bidDetails.project.user.lastName}`,
        serviceId: null,
        projectId: bidDetails.project.id,
        config: {
          isTeamMember: false,
          id: bidDetails.project.id,
          status: bidDetails.project.status,
          type: 'PROJECT'
        }
      })
      
      await this.bidRepository.update({
        id: id
      }, {
        taxPercentage: appliedTax ? appliedTax.taxPercentage : 0,
        taxUniqueCode: appliedTax ? appliedTax.taxUniqueId : null
      })
      approvedDate = moment().toDate()
    }

    await this.bidRepository.update({
      id: id
    }, { ...updateBidDto, approvedDate });

    if (updateBidDto.isShortListed) {
      // create shortlisted notification
      await this.notificationsService.create({
        userId: bidDetails.user.id,
        role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
        title: `Your bid has been shortlisted by ${bidDetails.project.user.firstName} ${bidDetails.project.user.lastName}`,
        description: `Your bid has been shortlisted by ${bidDetails.project.user.firstName} ${bidDetails.project.user.lastName}`,
        serviceId: null,
        projectId: bidDetails.project.id,
        config: {
          isTeamMember: false,
          id: bidDetails.project.id,
          status: bidDetails.project.status,
          type: 'PROJECT'
        }
      })
    }

    return {
      success: true
    }
  }

  async remove(id: number) {
    await this.bidRepository.delete({ id: id })
    return {
      success: true
    }
  }

  async assignTeamMember(id, userId, userTokenData) {
    try {
      await this.bidRepository.update({
        id: id
      }, {
        assignedToUser: {
          id: userId
        }
      })
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }
}
