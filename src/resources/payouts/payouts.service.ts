import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { MILESTONE_STATUS, PAYOUT_STATUS, PROJECT_STATUS } from 'src/global/enums';
import { Between, In, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { CommissionsService } from '../commissions/commissions.service';
import { Commission } from '../commissions/entities/commission.entity';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { Payout } from './entities/payout.entity';
import { Service } from '../services/entities/service.entity';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';
import { Milestone } from '../milestone/entities/milestone.entity';
import { Project } from '../project/entities/project.entity';
import { Bid } from '../bid/entities/bid.entity';
import { BookService } from '../book-service/entities/book-service.entity';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout) private payoutRepository: Repository<Payout>,
    @InjectStripe() private readonly stripeClient: Stripe,
    @InjectRepository(Milestone) private milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(Bid) private readonly bidRepository: Repository<Bid>,
    @InjectRepository(BookService) private bookServiceRepository: Repository<BookService>,
  ) { }

  async create(createPayoutDto: CreatePayoutDto) {
    try {
      let { serviceId, projectId, clientUserId, milestoneId, serviceProviderUserId, bookServiceId, ...createService } = createPayoutDto
      let create = await this.payoutRepository.create({
        service: {
          id: serviceId,
        }, project: {
          id: projectId
        },
        clientUser: {
          id: clientUserId
        },
        milestone: {
          id: milestoneId
        },
        serviceProviderUser: {
          id: serviceProviderUserId
        },
        bookService: {
          id: bookServiceId
        },
        ...createService
      } as any
      )
      return await this.payoutRepository.save(create);
    } catch (err) {
      throw err;
    }
  }

  async fetchPayoutAnalyticsByServiceAndProjectIds(serviceIds, projectIds) {
    try {
      let payoutProjectDetails: Array<any> = [];
      let payoutServiceDetails: Array<any> = [];
      if (projectIds.length) {
        payoutProjectDetails = await this.payoutRepository.find({
          where: {
            project: {
              id: In(projectIds)
            }
          }
        })
      }
      if (serviceIds.length) {
        payoutServiceDetails = await this.payoutRepository.find({
          where: {
            service: {
              id: In(serviceIds)
            }
          }
        })
      }
      const payoutDetails = [...payoutProjectDetails, ...payoutServiceDetails];
      let totalEarnings = 0;
      if (payoutDetails) {
        payoutDetails.forEach((payoutDetail) => {
          totalEarnings += payoutDetail.netEarning
        })
      }
      return totalEarnings;
    } catch (err) {
      throw err;
    }
  }

  async fetchPayoutAnalytics(startDate, endDate, userId) {
    try {
      let userWhere = {};
      if (userId) {
        userWhere = {
          serviceProviderUser: {
            id: userId
          }
        }
      }
      let payoutDetails = await this.payoutRepository.find({
        where: {
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()),
          ...userWhere
        }
      })
      let pendingPayout: any = {
        total: 0,
        services: 0,
        projects: 0
      };
      let paidToServiceProvider: any = {
        total: 0,
        services: 0,
        projects: 0
      };
      let earnings: any = {
        total: 0,
        services: 0,
        projects: 0
      };
      if (payoutDetails) {
        payoutDetails.forEach((payoutDetail) => {
          if (payoutDetail.status === PAYOUT_STATUS.TRANSFERRED) {
            paidToServiceProvider.total += payoutDetail.payableToSP
            if (payoutDetail.project) {
              paidToServiceProvider.projects += payoutDetail.payableToSP
            }
            if (payoutDetail.service) {
              paidToServiceProvider.services += payoutDetail.payableToSP
            }
          }
          if (payoutDetail.status === PAYOUT_STATUS.PENDING) {
            pendingPayout.total += payoutDetail.payableToSP
            if (payoutDetail.project) {
              pendingPayout.projects += payoutDetail.payableToSP
            }
            if (payoutDetail.service) {
              pendingPayout.services += payoutDetail.payableToSP
            }
          }
          earnings.total += payoutDetail.netEarning
          if (payoutDetail.project) {
            earnings.projects += payoutDetail.netEarning
          }
          if (payoutDetail.service) {
            earnings.services += payoutDetail.netEarning
          }
        })
      }
      return {
        pendingPayout,
        paidToServiceProvider,
        earnings
      }
    } catch (err) {
      throw err;
    }
  }

  async findAll(searchString, startDate, endDate, status, limit, offset, orderKey, orderSeq) {
    try {
      let where: any = {};
      if (searchString) {
        where['id'] = Like(`%${searchString}%`);
      }
      if (status === 'ALL') {
        where['status'] = In([PAYOUT_STATUS.PENDING, PAYOUT_STATUS.TRANSFERRED])
      }
      if (startDate) {
        where['created_at'] = MoreThanOrEqual(moment(startDate).startOf('day').toISOString());
      }
      if (endDate) {
        where['created_at'] = LessThanOrEqual(moment(endDate).endOf('day').toISOString());
      }
      if (endDate && startDate) {
        where['created_at'] = Between(moment(startDate).startOf('day').toISOString(), moment(endDate).endOf('day').toISOString())
      }
      if (status !== 'ALL') {
        where['status'] = status;
      }
      let order: object = { created_at: 'DESC' }
      if (orderKey === "created_at") {
        order = { created_at: orderSeq }
      }

      let result = await this.payoutRepository.findAndCount({
        where: where,
        skip: offset,
        order: order,
        take: limit,
        relations: ["milestone", "project"]
      })

      return {
        data: result[0],
        count: result[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async findById(id) {
    try {

      let result = await this.payoutRepository.findOne({
        where: { id: id },
        order: { created_at: 'DESC' },
        relations: ["milestone", "project","bookService"]
      })

      let where: object = {}
      if (result.project?.id) {
        where = {
          isApproved: true,
          isShortListed: true,
          project: result.project?.id
        }
        let bids = await this.bidRepository.createQueryBuilder('bid')
          .leftJoinAndSelect('bid.project', `project'`)
          .innerJoinAndSelect('bid.user', 'user')
          .andWhere(where)
          .getOne()

        result["service_provider"] = bids
      }
      else if (result.bookService?.id) {
        where = {
          id: result.bookService?.id
        }
        let services = await this.bookServiceRepository.createQueryBuilder('bookService')
          .leftJoinAndSelect('bookService.user', 'serviceUser')
          .andWhere(where)
          .getOne()
        result["service_provider"] = services
      }

      return {
        data: result
      }
    } catch (err) {
      throw err;
    }
  }

  async updateStatus(id, status) {
    try {
      const payout = await this.payoutRepository.findOne({ where: { id: id }, relations: ['serviceProviderUser', "milestone", "project"] });
      payout.status = status;
      if (payout.serviceProviderUser && payout.serviceProviderUser.connectedAccountId) {
        await this.stripeClient.transfers.create({
          amount: Math.round(payout.payableToSP * 100),
          currency: 'usd',
          destination: payout.serviceProviderUser.connectedAccountId,
          metadata: {
            transaction_id: payout?.id,
            sp_first_name: payout?.serviceProviderUser?.firstName,
            sp_last_name: payout?.serviceProviderUser?.lastName,
            sp_email: payout?.serviceProviderUser?.email,
            sp_mobile: payout?.serviceProviderUser?.contactNumber,
            project_id: payout?.project?.id,
            project_title: payout?.project?.headline,
            milestone_id: payout?.milestone?.id,
            milestone_title: payout?.milestone?.title
          }
        })
      }
      if (payout.milestone?.id) {
        await this.milestoneRepository.update({ id: payout?.milestone?.id }, { status: MILESTONE_STATUS.PAYMENT_RELEASE, isCompleted: true })

        let mileStone = await this.milestoneRepository.find({ where: { project: { id: payout?.project?.id } } })
        let filter = mileStone.filter(item => item.isCompleted)

        if (mileStone.length === filter.length) {
          await this.projectRepository.update({ id: payout?.project?.id }, { status: PROJECT_STATUS.COMPLETED })
        }
      }
      return await this.payoutRepository.save(payout);
    } catch (err) {
      throw err;
    }
  }

  async approveReleasePayout(milestoneId: number) {
    try {
      const payout = await this.payoutRepository.findOne({ where: { milestone: { id: milestoneId } } });

      if (!payout) {
        return { error: "Payout not found for the milestone." }
      }
      payout.milestonePaymentReleaseRequest = true;
      return await this.payoutRepository.save(payout);
    } catch (err) {
      throw err;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} payout`;
  }

  update(id: number, updatePayoutDto: UpdatePayoutDto) {
    return `This action updates a #${id} payout`;
  }

  remove(id: number) {
    return `This action removes a #${id} payout`;
  }
}
