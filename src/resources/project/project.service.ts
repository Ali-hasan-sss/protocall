import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CATEGORY_ASSOCIATE, COST_TYPE, PROJECT_PREFS, PROJECT_STATUS, ROLE } from 'src/global/enums';
import { Between, FindOneOptions, In, MoreThan, Not, Repository } from 'typeorm';
import { Invoice } from '../invoice/entities/invoice.entity';
import { Milestone } from '../milestone/entities/milestone.entity';
import { MilestoneService } from '../milestone/milestone.service';
import { SubCategory } from '../sub-category/entities/sub-category.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import * as moment from 'moment';
import { BidService } from '../bid/bid.service';
import { ReviewService } from '../review/review.service';
import { Review } from '../review/entities/review.entity';
import { UserService } from '../user/user.service';
import { ServicesService } from '../services/services.service';
import { SavedService } from '../saved/saved.service';
import { faker } from '@faker-js/faker';
import _ from 'underscore';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionsService } from '../commissions/commissions.service';
import { PayoutsService } from '../payouts/payouts.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Milestone) private milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @Inject(MilestoneService) private readonly milestoneService: MilestoneService,
    @Inject(forwardRef(() => BidService)) private readonly bidService: BidService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => SavedService)) private readonly savedService: SavedService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => CommissionsService)) private readonly commissionsService: CommissionsService,
    @Inject(forwardRef(() => PayoutsService)) private readonly payoutsService: PayoutsService,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @Inject(forwardRef(() => PaymentService)) private paymentService: PaymentService,
  ) { }

  async create(createProjectDto: CreateProjectDto, userTokenData: any) {
    let createProjectInstance = await this.projectRepository.create({
      ...createProjectDto, user: {
        id: userTokenData.appUserId
      }
    })
    return await this.projectRepository.save(createProjectInstance);
  }

  findAll() {
    return `This action returns all project`;
  }

  async findOne(options: FindOneOptions<Project>) {
    return await this.projectRepository.findOne(options);
  }

  async fetchAllProjects(status, searchString, startDate, endDate, limit, offset,orderKey, orderSeq: 'DESC' | 'ASC') {
    try {
      let searchWhere = '1=1';
      let where: any = {
        status: status
      }
      if (status === "ALL") {
        where = {}
      }
      if (startDate && endDate) {
        where['created_at'] = Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      if (searchString !== '' && searchString !== undefined) {
        searchWhere = `(user.first_name LIKE '%${searchString}%' OR user.last_name LIKE '%${searchString}%' OR project.headline LIKE '%${searchString}%')`
      }

      orderSeq = orderSeq || 'DESC'
      orderKey = orderKey || 'created_at'

      // fetching all the projects
      let projects = await this.projectRepository.createQueryBuilder('project')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.bids', 'bids')
        .where(where)
        .andWhere(searchWhere)
        .take(limit)
        .skip(offset)
        .orderBy(`project.${orderKey}`, `${orderSeq}`)
        .getManyAndCount()

      // return projects
      projects[0].forEach(project => {
        project['totalNumberOfBids'] = project.bids.length;
        project['avgBid'] = project.bids.map(bid => { return bid.bidAmount }).reduce((bidPrev, bidCurrent) => { return bidPrev + bidCurrent }, 0)
        project['noOfShortlistedBids'] = project.bids.filter(b => b.isShortListed).length
      })
      return {
        projects: projects[0],
        totalCount: projects[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async getProjectIdsBySubcategories(subCategoryIds) {
    try {
      let p = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.subCategories', 'subCategories', 'subCategories.id In (:ids)', { ids: subCategoryIds })
        .getMany()
      return _.pluck(p, 'id')
    } catch (err) {
      throw err;
    }
  }

  async getProjectIdsBySubcategoriesAndDate(startDate, endDate, subCategoryIds) {
    try {
      // console.log(subCategoryIds);
      let s: [string, string, string, any] = ['project.subCategories', 'subCategories', 'subCategories.id In (:ids)', { ids: subCategoryIds }];
      if (!subCategoryIds.length) {
        s = ['project.subCategories', 'subCategories', null, null];
      }
      let p = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect(...s)
        .where({
          status: PROJECT_STATUS.COMPLETED,
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()),
        })
        .getMany()
      return _.pluck(p, 'id')
    } catch (err) {
      throw err;
    }
  }

  async totalProjectCount(startDate, endDate, userId, subCategoryIds: Array<number>) {
    try {
      let pIds: Array<number> = []
      let idFilter = '1=1';
      let idWhere: any = {}
      let where = {
        created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      if (userId) {
        let projectIds = await this.bidService.getProjectIds(userId)
        if (projectIds.length) {
          pIds = projectIds
        }
      }
      if (subCategoryIds.length) {
        let pIdsUpdated = false;
        let projectIds = await this.getProjectIdsBySubcategories(subCategoryIds)
        if (pIds.length && projectIds.length) {
          pIdsUpdated = true;
          pIds = projectIds.filter(id => { return pIds.includes(id) });
        }
        if (projectIds.length && !pIdsUpdated) {
          pIds = projectIds;
        }
      }

      if (pIds.length) {
        idWhere = {
          id: In(pIds)
        }
        idFilter = `project.id In (${pIds.join(',')})`;
      }
      if ((subCategoryIds.length || userId) && !pIds.length) {
        idFilter = `project.id =0`;
      }

      let projectCompletedCount = await this.projectRepository.count({
        where: { ...where, ...idWhere, status: PROJECT_STATUS.COMPLETED }
      })
      let projectInProgressCount = await this.projectRepository.count({
        where: { ...where, ...idWhere, status: PROJECT_STATUS.IN_PROGRESS }
      })
      let projectPostedCount = await this.projectRepository.count({
        where: { ...where, ...idWhere, status: PROJECT_STATUS.POSTED }
      })

      let projects = await this.projectRepository.createQueryBuilder('project')
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .where({
          ...where,
          status: In([PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.COMPLETED])
        })
        .andWhere(idFilter)
        .getMany()

      let totalProjectValue = 0;
      projects.forEach((project) => {
        if (project.bids.length) {
          let approvedBid = project.bids.find(bid => bid.isApproved);
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  let totalNumberOfHours = 0;
                  if (milestone.timeSheet) {
                    let timeSheet = JSON.parse(milestone.timeSheet)
                    timeSheet.forEach(slot => {
                      totalNumberOfHours += slot.hoursCompleted
                    })
                  }
                  milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                  totalProjectValue += milestone['calculatedCost']
                })
              }
            } else {
              totalProjectValue = totalProjectValue + approvedBid.bidAmount;
            }
          }
        }
      })
      return {
        totalProjectValue,
        projectCompletedCount,
        projectInProgressCount,
        projectPostedCount
      }
    } catch (err) {
      throw err;
    }
  }

  calculateProjectExtraFields(project: Project) {
    project['totalNumberOfBids'] = project.bids.length;
    project['totalNumberOfShortlisted'] = 0;
    project['avgBid'] = 0;
    project['completion'] = 0;
    if (project.milestones) {
      project['completion'] = Math.round((project.milestones.reduce((acc, curr) => {
        if (curr.isCompleted) {
          acc++
        }
        return acc;
      }, 0)) / project.milestones.length) * 100
    }
    if (project.bids.length) {
      project['avgBid'] = (project.bids.reduce((acc, currentValue) => {
        if (currentValue.isApproved) {
          project['approvedBudget'] = currentValue.bidAmount;
        }
        if (currentValue.isShortListed) {
          project['totalNumberOfShortlisted']++;
        }
        acc += currentValue.bidAmount;
        return acc;
      }, 0)) / project.bids.length
    }
    return project;
  }

  async findAllByStatus(status, limit, offset, userTokenData) {
    try {
      let [projects, total] = await this.projectRepository.findAndCount({
        where: {
          status: In(status),
          user: {
            id: userTokenData.appUserId
          }
        },
        relations: ['bids', 'subCategories', 'milestones'],
        take: limit,
        skip: offset,
        order: {
          id: "DESC"
        }
      })

      let response: any = []
      if (projects && projects.length) {
        projects.forEach(project => {
          response.push(this.calculateProjectExtraFields(project));
        })
      }
      return {
        data: response || [],
        totalCount: total || 0,
        totalPageCount: total ? Math.ceil(total / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async findProjectsBySubCategories(subCategories, limit, offset, filters, userTokenData) {
    try {
      // fetch user
      let user = await this.userService.findOne({
        where: {
          id: userTokenData.appUserId
        },
        select: ['id', 'isOffsite', 'isOnsite']
      })

      let categorySelect: [string, string, string | null, any]
      if (user.isOffsite) {
        categorySelect = ['subCategories.categoryMaster', 'categoryMaster', 'categoryMaster.associate=:associate', { associate: CATEGORY_ASSOCIATE.OFFSITE }];
      }
      if (user.isOnsite) {
        categorySelect = ['subCategories.categoryMaster', 'categoryMaster', 'categoryMaster.associate=:associate', { associate: CATEGORY_ASSOCIATE.ONSITE }];
      }
      if (user.isOffsite && user.isOnsite) {
        categorySelect = ['subCategories.categoryMaster', 'categoryMaster', null, null];
      }
      if (!user.isOffsite && !user.isOnsite) {
        categorySelect = ['subCategories.categoryMaster', 'categoryMaster', null, null];
      }

      let array: [string, string, string | null, any] = ['project.subCategories', 'subCategories', null, null];

      // filter logic
      let orderSorting: [string, "ASC" | "DESC"] = ['project.created_at', "ASC"]
      let typeWhere = '1=1';
      let rangeWhere = '1=1';
      let ratingWhere = '1=1';
      let locationWhere = '1=1';
      let lat = '';
      let lng = '';
      let ratingSelect = `(SELECT AVG(avg_review) from review where fk_id_user=user.id AND role IN ('${ROLE.CLIENT}'))`;
      if (filters) {
        // sorting
        if (filters.sorting) {
          let keys = Object.keys(filters.sorting);
          if (keys.includes('createdAt')) {
            orderSorting = ['project.created_at', filters.sorting.createdAt || "ASC"]
          }
          if (keys.includes('bidAmount')) {
            orderSorting = ['bids.bidAmount', filters.sorting.bidAmount || "ASC"]
          }
          if (keys.includes('numberOfBids')) {
            orderSorting = ['totalBids', filters.sorting.numberOfBids || "ASC"]
          }
          if (keys.includes('rating')) {
            orderSorting = ['reviewAvg', filters.sorting.rating || "ASC"]
          }
        }
        if (filters.location) {
          locationWhere = `calculatedDistance <= user.availability_distance AND calculatedDistance <= ${filters.location.proximity} OR categoryMaster.associate= "${CATEGORY_ASSOCIATE.OFFSITE}"`
          lat = filters.location.lat;
          lng = filters.location.lng
        }
        // range logic
        if (filters.range) {
          let keys = Object.keys(filters.range);
          if (keys.includes('fixedPrice')) {
            rangeWhere = `project.cost_type='${COST_TYPE.FIXED_COST}' AND (project.service_min_cost >= ${filters.range.fixedPrice.minCost} AND project.service_max_cost <= ${filters.range.fixedPrice.maxCost})`
          }
          if (keys.includes('hourly')) {
            rangeWhere = `project.cost_type='${COST_TYPE.HOURLY}' AND project.service_min_cost >= ${filters.range.hourly.minCost} AND project.service_max_cost <= ${filters.range.hourly.maxCost}`
          }
          if (keys.includes('fixedPrice') && keys.includes('hourly')) {
            rangeWhere = `
          (project.cost_type='${COST_TYPE.FIXED_COST}' AND project.service_min_cost >= ${filters.range.fixedPrice.minCost} AND project.service_max_cost <= ${filters.range.fixedPrice.maxCost})
          OR (project.cost_type='${COST_TYPE.HOURLY}' AND project.service_min_cost >= ${filters.range.hourly.minCost} AND project.service_max_cost <= ${filters.range.hourly.maxCost})`
          }
        }
        // type of user filter
        if (filters.type) {
          if (filters.type === PROJECT_PREFS.INDIVIDUAL) {
            typeWhere = `project.projectPref = '${PROJECT_PREFS.INDIVIDUAL}'`;
          }
          if (filters.type === PROJECT_PREFS.COMPANY) {
            typeWhere = `project.projectPref = '${PROJECT_PREFS.COMPANY}'`;
          }
        }
      }
      if (subCategories.length && subCategories[0] !== '0') {
        array = [
          'project.subCategories',
          'subCategories',
          'subCategories.id IN (:subCategories)', {
            subCategories: subCategories
          }
        ]
      }
      let bidCount = await this.bidService.count({
        where: {
          user: {
            id: userTokenData.appUserId
          }
        }
      })
      if (filters.rating) {
        ratingWhere = `reviewAvg BETWEEN ${filters.rating.minRating} AND ${filters.rating.maxRating}`
      }
      let where = '1=1';
      if (bidCount) {
        where = `project.id NOT IN (SELECT fk_id_project from bid where fk_id_user=${userTokenData.appUserId})`
      }
      let projects = await this.projectRepository.createQueryBuilder('project')
        .addSelect('(SELECT COUNT(id) from bid where fk_id_project=project.id)', 'totalBids')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=project.fk_id_user)`, 'calculatedDistance')
        .addSelect(ratingSelect, 'reviewAvg')
        .innerJoinAndSelect(...array)
        .innerJoinAndSelect(...categorySelect)
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .andWhere({
          status: PROJECT_STATUS.POSTED,
          biddingEndDate: MoreThan(moment().toDate())
        })
        .andWhere(where)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .orderBy(...orderSorting)
        .take(limit)
        .skip(offset)
        .getRawAndEntities()
      let count = await this.projectRepository.createQueryBuilder('project')
        .addSelect('(SELECT COUNT(id) from bid where fk_id_project=project.id)', 'totalBids')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=project.fk_id_user)`, 'calculatedDistance')
        .addSelect(ratingSelect, 'reviewAvg')
        .innerJoinAndSelect(...array)
        .innerJoinAndSelect(...categorySelect)
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .andWhere({
          status: PROJECT_STATUS.POSTED,
          biddingEndDate: MoreThan(moment().toDate())
        })
        .andWhere(where)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .orderBy(...orderSorting)
        .getRawAndEntities()
      let response: any = []
      projects.entities.forEach(project => {
        response.push(this.calculateProjectExtraFields(project));
        const user = project.user;
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;

        user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
        });
        let totalReviewCount = user.reviews.length
        // getting an avg
        let avg = 0;
        if (user.reviews && user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (user.reviews.length * 4)
        }
        user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      })
      return {
        projects: response,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchTeamMemberProjectAnalytics(startDate, endDate, teamMemberIds, userTokenData) {
    try {
      let bidCondition = `bids.fk_id_assigned_to_user IN (${teamMemberIds.join(',')})`;
      if (!teamMemberIds.length) {
        bidCondition = `bids.fk_id_user=${userTokenData.appUserId}`;
      }
      bidCondition += ' AND bids.isApproved=true AND bids.created_at BETWEEN :startDate AND :endDate'
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() })
        .leftJoinAndSelect('project.milestones', 'milestones')
        .andWhere({
          status: Not(In([PROJECT_STATUS.DRAFT, PROJECT_STATUS.POSTED, PROJECT_STATUS.INACTIVE]))
        })
        .getMany()

      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let hired = 0;
      let totalEarned = 0;
      let successRatio = 100;

      projects.forEach(project => {
        if (project.status === PROJECT_STATUS.COMPLETED) {
          project['totalEarned'] = 0;
          let approvedBid = project.bids.find(bid => bid.isApproved);
          // calculate if cost if project is hourly
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  let totalNumberOfHours = 0;
                  if (milestone.timeSheet) {
                    let timeSheet = JSON.parse(milestone.timeSheet)
                    timeSheet.forEach(slot => {
                      totalNumberOfHours += slot.hoursCompleted
                    })
                  }
                  milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                  project['totalEarned'] += milestone['calculatedCost']
                })
              }
            } else {
              project['totalEarned'] = approvedBid.bidAmount;
            }
          }
          totalEarned += project['totalEarned'];
          completed++;
        }
        if (project.status === PROJECT_STATUS.CANCEL) {
          cancelled++;
        }
        if (project.status === PROJECT_STATUS.IN_PROGRESS) {
          let approvedBid = project.bids.find(bid => bid.isApproved);
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  if (!milestone.isCompleted) {
                    let totalNumberOfHours = 0;
                    if (milestone.timeSheet) {
                      let timeSheet = JSON.parse(milestone.timeSheet)
                      timeSheet.forEach(slot => {
                        totalNumberOfHours += slot.hoursCompleted
                      })
                    }
                    pendingPayment += totalNumberOfHours * approvedBid.bidAmount
                  }
                })
              }
            } else {
              project.milestones.forEach(milestone => {
                if (milestone.isCompleted) {
                  pendingPayment += approvedBid.bidAmount - (approvedBid.bidAmount * (milestone.paymentToBeReleased / 100))
                }
              })
              if (!pendingPayment) {
                pendingPayment = approvedBid.bidAmount
              }
            }
          }
          inProgress++;
        }
      });

      hired = inProgress + completed;
      // successRatio = (cancelled / projects.length) * 100;
      successRatio = (completed / projects.length) * 100;

      return {
        completed,
        inProgress,
        pendingPayment,
        cancelled,
        hired,
        totalEarned,
        successRatio
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchProjectAnalytics(startDate, endDate, userTokenData) {
    try {
      let bidCondition = 'bids.fk_id_user=:userId'
      if (userTokenData.isTeamMember) {
        bidCondition = 'bids.fk_id_assigned_to_user=:userId'
      }
      bidCondition += ' AND bids.isApproved=true AND bids.created_at BETWEEN :startDate AND :endDate'
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId, startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() })
        .leftJoinAndSelect('project.milestones', 'milestones')
        .andWhere({
          status: Not(In([PROJECT_STATUS.DRAFT, PROJECT_STATUS.POSTED, PROJECT_STATUS.INACTIVE]))
        })
        .getMany()

      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let hired = 0;
      let totalEarned = 0;
      let successRatio = 0;

      projects.forEach(project => {
        if (project.status === PROJECT_STATUS.COMPLETED) {
          totalEarned += project.totalAmountAfterCommission;
          completed++;
        }
        if (project.status === PROJECT_STATUS.CANCEL) {
          cancelled++;
        }
        if (project.status === PROJECT_STATUS.IN_PROGRESS) {
          let approvedBid = project.bids.find(bid => bid.isApproved);
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  if (!milestone.isCompleted) {
                    let totalNumberOfHours = 0;
                    if (milestone.timeSheet) {
                      let timeSheet = JSON.parse(milestone.timeSheet)
                      timeSheet.forEach(slot => {
                        totalNumberOfHours += slot.hoursCompleted
                      })
                    }
                    pendingPayment += totalNumberOfHours * approvedBid.bidAmount
                  }
                })
              }
            } else {
              project.milestones.forEach(milestone => {
                if (milestone.isCompleted) {
                  pendingPayment += approvedBid.bidAmount - (approvedBid.bidAmount * (milestone.paymentToBeReleased / 100))
                }
              })
              if (!pendingPayment) {
                pendingPayment = approvedBid.bidAmount
              }
            }
          }
          inProgress++;
        }
      });

      hired = inProgress + completed;
      if (cancelled) {
        successRatio = (cancelled / projects.length) * 100;
      }

      return {
        completed,
        inProgress,
        pendingPayment,
        cancelled,
        hired,
        totalEarned,
        successRatio
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchPastProjects(limit, offset, userTokenData) {
    try {
      let bidCondition = 'bids.fk_id_user=:userId'
      if (userTokenData.isTeamMember) {
        bidCondition = 'bids.fk_id_assigned_to_user=:userId'
      }
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId })
        .leftJoinAndSelect('bids.assignedToUser', 'assignedUser')
        .leftJoinAndSelect('assignedUser.reviews', 'assignedUserReviews')
        .leftJoinAndSelect('assignedUser.profilePicId', 'assignedUserProfilePicId')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED
        })
        .take(limit)
        .skip(offset)
        .getMany()

      let count = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId })
        .leftJoinAndSelect('bids.assignedToUser', 'assignedUser')
        .leftJoinAndSelect('assignedUser.reviews', 'assignedUserReviews')
        .leftJoinAndSelect('assignedUser.profilePicId', 'assignedUserProfilePicId')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED
        })
        .getCount()

      if (!projects.length) {
        return {
          data: [],
          totalCount: 0,
          totalPageCount: 0
        }
      }
      let response: any = []
      projects.forEach(project => {
        project['totalEarned'] = 0;
        let approvedBid = project.bids.find(bid => bid.isApproved);
        // calculate if cost if project is hourly
        if (approvedBid) {
          if (project.costType === COST_TYPE.HOURLY) {
            if (project.milestones.length) {
              project.milestones.forEach(milestone => {
                let totalNumberOfHours = 0;
                if (milestone.timeSheet) {
                  let timeSheet = JSON.parse(milestone.timeSheet)
                  timeSheet.forEach(slot => {
                    totalNumberOfHours += slot.hoursCompleted
                  })
                }
                milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                project['totalEarned'] += milestone['calculatedCost']
              })
            }
          } else {
            project['totalEarned'] = approvedBid.bidAmount;
          }
        }
        // calculate reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let reviewLength = 0;
        if (approvedBid?.assignedToUser) {
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          approvedBid.assignedToUser.reviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          let totalReviewCount = approvedBid.assignedToUser.reviews.length
          // getting an avg
          let avg = 0;
          if (approvedBid.assignedToUser.reviews && approvedBid.assignedToUser.reviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (approvedBid.assignedToUser.reviews.length * 6)
          }
          approvedBid.assignedToUser['reviewInfo'] = {
            totalAvg: avg.toFixed(1),
            totalReviewCount: totalReviewCount
          }
          project['assignedUser'] = approvedBid.assignedToUser
        }
        project.user.reviews.forEach(review => {
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
        if (project.user.reviews && reviewLength) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (reviewLength * 4)
        }
        project.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        response.push(project)
      })
      return {
        data: response,
        totalCount: count,
        totalPageCount: count ? Math.ceil(count / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async findByProjectId(id: number) {
    try {
      return await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('bids.assignedToUser', 'assignedUser')
        .leftJoinAndSelect('assignedUser.reviews', 'assignedUserReviews')
        .leftJoinAndSelect('assignedUser.profilePicId', 'assignedUserProfilePicId')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          id: id
        })
        .getOne()
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async fetchProjectByDate(startDate, endDate, limit, offset, userTokenData) {
    try {
      let totalEarned = 0;
      let totalEarnedAfterCommission = 0;
      let bidCondition = 'bids.fk_id_user=:userId'
      if (userTokenData.isTeamMember) {
        bidCondition = 'bids.fk_id_assigned_to_user=:userId'
      }
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId })
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED,
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
        })
        .take(limit)
        .skip(offset)
        .orderBy('project.created_at', 'ASC')
        .getRawAndEntities()

      let count = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId })
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED,
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
        })
        .orderBy('project.created_at', 'ASC')
        .getRawAndEntities()

      if (!projects.entities.length) {
        return {
          data: [],
          amount: 0,
          totalCount: 0,
          totalPageCount: 0
        }
      }

      count.entities.forEach((e) => {
        totalEarned += e.totalAmountNew;
        totalEarnedAfterCommission += e.totalAmountAfterCommission
      })

      let response: any = []
      projects.entities.forEach(project => {
        project['totalEarned'] = 0;
        let approvedBid = project.bids.find(bid => bid.isApproved);
        // calculate if cost if project is hourly
        if (approvedBid) {
          if (project.costType === COST_TYPE.HOURLY) {
            if (project.milestones.length) {
              project.milestones.forEach(milestone => {
                let totalNumberOfHours = 0;
                if (milestone.timeSheet) {
                  let timeSheet = JSON.parse(milestone.timeSheet)
                  timeSheet.forEach(slot => {
                    totalNumberOfHours += slot.hoursCompleted
                  })
                }
                milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                project['totalEarned'] += milestone['calculatedCost']
              })
            }
          } else {
            project['totalEarned'] = approvedBid.bidAmount;
          }
        }
        // calculate reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let reviewLength = 0
        project.user.reviews.forEach(review => {
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
        if (project.user.reviews && reviewLength) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (reviewLength * 4)
        }
        project.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        response.push(project)
      })
      return {
        data: response,
        amount: totalEarned,
        totalEarnedAfterCommission,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchProjectForClientByDate(startDate, endDate, limit, offset, userTokenData) {
    try {
      let totalSpent = 0;
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED,
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()),
          user: {
            id: userTokenData.appUserId
          }
        })
        .take(limit)
        .skip(offset)
        .getRawAndEntities();

      let count = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere({
          status: PROJECT_STATUS.COMPLETED,
          created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()),
          user: {
            id: userTokenData.appUserId
          }
        })
        .getRawAndEntities()

      if (!projects.entities.length) {
        return {
          data: [],
          amount: 0,
          totalCount: 0,
          totalPageCount: 0
        }
      }
      let response: any = [];

      count.entities.forEach((e) => {
        totalSpent += e.totalAmountNew;
      });

      projects.entities.forEach(project => {
        project['totalEarned'] = 0;
        let approvedBid = project.bids.find(bid => bid.isApproved);
        // calculate if cost if project is hourly
        if (approvedBid) {
          if (project.costType === COST_TYPE.HOURLY) {
            if (project.milestones.length) {
              project.milestones.forEach(milestone => {
                let totalNumberOfHours = 0;
                if (milestone.timeSheet) {
                  let timeSheet = JSON.parse(milestone.timeSheet)
                  timeSheet.forEach(slot => {
                    totalNumberOfHours += slot.hoursCompleted
                  })
                }
                milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                project['totalEarned'] += milestone['calculatedCost']
              })
            }
          } else {
            project['totalEarned'] = approvedBid.bidAmount;
          }
          project['approvedBudget'] = approvedBid.bidAmount;
        }
        response.push(project)
      })

      return {
        data: response,
        amount: totalSpent,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchProjectAnalyticsForClient(startDate, endDate, userTokenData) {
    try {
      let bidCondition: string;
      bidCondition = 'bids.isApproved=true AND bids.created_at BETWEEN :startDate AND :endDate'
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.bids', 'bids', bidCondition, { startDate: moment(startDate).startOf('day').toDate(), endDate: moment(endDate).endOf('day').toDate() })
        .leftJoinAndSelect('project.milestones', 'milestones')
        .andWhere({
          user: {
            id: userTokenData.appUserId
          },
          status: Not(In([PROJECT_STATUS.DRAFT, PROJECT_STATUS.POSTED, PROJECT_STATUS.INACTIVE]))
        })
        .getMany()

      if (!projects.length) {
        return {}
      }

      let completed = 0;
      let inProgress = 0;
      let pendingPayment = 0;
      let cancelled = 0;
      let hired = 0;
      let totalSpent = 0;
      let successRatio = 0;

      projects.forEach(project => {
        if (project.status === PROJECT_STATUS.COMPLETED) {
          project['totalEarned'] = 0;
          let approvedBid = project.bids.find(bid => bid.isApproved);
          // calculate if cost if project is hourly
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  let totalNumberOfHours = 0;
                  if (milestone.timeSheet) {
                    let timeSheet = JSON.parse(milestone.timeSheet)
                    timeSheet.forEach(slot => {
                      totalNumberOfHours += slot.hoursCompleted
                    })
                  }
                  milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
                  project['totalEarned'] += milestone['calculatedCost']
                })
              }
            } else {
              project['totalEarned'] = approvedBid.bidAmount;
            }
          }
          totalSpent += project['totalEarned'];
          completed++;
        }

        if (project.status === PROJECT_STATUS.CANCEL) {
          cancelled++;
        }

        if (project.status === PROJECT_STATUS.IN_PROGRESS) {
          let approvedBid = project.bids.find(bid => bid.isApproved);
          if (approvedBid) {
            if (project.costType === COST_TYPE.HOURLY) {
              if (project.milestones.length) {
                project.milestones.forEach(milestone => {
                  if (milestone.isCompleted) {
                    let totalNumberOfHours = 0;
                    if (!milestone.timeSheet) {
                      let timeSheet = JSON.parse(milestone.timeSheet)
                      timeSheet.forEach(slot => {
                        totalNumberOfHours += slot.hoursCompleted
                      })
                    }
                    pendingPayment += totalNumberOfHours * approvedBid.bidAmount
                  }
                })
              }
            } else {
              project.milestones.forEach(milestone => {
                if (milestone.isCompleted) {
                  pendingPayment += approvedBid.bidAmount - (approvedBid.bidAmount * (milestone.paymentToBeReleased / 100))
                }
              })
              if (!pendingPayment) {
                pendingPayment = approvedBid.bidAmount
              }
            }
          }
          inProgress++;
        }
      });

      hired = inProgress + completed;

      if (cancelled) {
        successRatio = (cancelled / projects.length) * 100;
      }

      return {
        completed,
        inProgress,
        pendingPayment,
        cancelled,
        hired,
        totalSpent,
        successRatio
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchProjectAdmin(id) {
    try {
      let where: any = {
        id: id
      }
      // let project = await this.projectRepository.findOne({
      //   where: where,
      //   relations: ['bids', 'subCategories', 'milestones', 'bids.user', 'bids.assignedToUser', 'bids.assignedToUser.reviews', 'bids.assignedToUser.profilePicId', 'bids.user.reviews', 'bids.user.profilePicId']
      // })
      let project = await this.projectRepository.createQueryBuilder('project')
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.subCategories', 'subCategories')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('bids.user', 'bidUser')
        .leftJoinAndSelect('bids.assignedToUser', 'bidsAssignedToUser')
        .leftJoinAndSelect('bidsAssignedToUser.reviews', 'AReviews')
        .leftJoinAndSelect('bidsAssignedToUser.profilePicId', 'AProfilePicId')
        .leftJoinAndSelect('bidUser.reviews', 'reviews')
        .leftJoinAndSelect('bidUser.profilePicId', 'profilePicId')
        .where(where)
        .getOne()

      if (!project) {
        throw new NotFoundException('Project Not found');
      }
      project = this.calculateProjectExtraFields(project);
      let approvedBid = project.bids.find(bid => bid.isApproved);
      if (approvedBid) {
        project['totalProjectsCompleted'] = await this.countUserProjects(approvedBid.user.id);
        if (project.costType === COST_TYPE.HOURLY) {
          if (project.milestones.length) {
            project.milestones.forEach(milestone => {
              let totalNumberOfHours = 0;
              if (milestone.timeSheet) {
                let timeSheet = JSON.parse(milestone.timeSheet)
                timeSheet.forEach(slot => {
                  totalNumberOfHours += slot.hoursCompleted
                })
              }
              milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
            })
          }
        } else {
          if (project.milestones.length) {
            project.milestones.forEach(milestone => {
              milestone['calculatedCost'] = (milestone.paymentToBeReleased / 100) * approvedBid.bidAmount;
            })
          }
        }
      }
      return project;
    } catch (err) {
      throw err;
    }
  }

  async findById(id, userTokenData) {
    try {
      // console.log(id);
      let where: any = {
        id: id
      }
      if (userTokenData.role === ROLE.CLIENT) {
        where = {
          id: id,
          user: {
            id: userTokenData.appUserId
          }
        }
      }
      let project = await this.projectRepository.createQueryBuilder('project')
        .leftJoinAndSelect('project.user', 'projectUser')
        .leftJoinAndSelect('project.bids', 'bids')
        .leftJoinAndSelect('project.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('milestones.files', 'files')
        .leftJoinAndSelect('bids.assignedToUser', 'assignedToUser')
        .leftJoinAndSelect('assignedToUser.reviews', 'reviews')
        .leftJoinAndSelect('assignedToUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('bids.user', 'user')
        .leftJoinAndSelect('user.reviews', 'userReviews')
        .leftJoinAndSelect('user.profilePicId', 'userProfilePicId')
        .where(where)
        .getOne()

      if (!project) {
        throw new NotFoundException('Project Not found');
      }

      project.user['projectsPosted'] = await this.projectRepository.count({
        where: {
          user: {
            id: project.user.id
          },
          status: Not(PROJECT_STATUS.INACTIVE)
        },
      })
      project = this.calculateProjectExtraFields(project);

      let approvedBid = project.bids.find(bid => bid.isApproved);
      // calculate if cost if project is hourly
      if (approvedBid) {
        if (approvedBid.assignedToUser) {
          let user = approvedBid.assignedToUser
          let totalReview1 = 0;
          let totalReview2 = 0;
          let totalReview3 = 0;
          let totalReview4 = 0;
          let totalReview5 = 0;
          let totalReview6 = 0;

          user.reviews.forEach(review => {
            totalReview1 += review.review1
            totalReview2 += review.review2
            totalReview3 += review.review3
            totalReview4 += review.review4
            totalReview5 += review.review5
            totalReview6 += review.review6
          });
          let totalReviewCount = user.reviews.length
          // getting an avg
          let avg = 0;
          if (user.reviews && user.reviews.length) {
            avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (user.reviews.length * 6)
          }
          user['reviewInfo'] = {
            totalAvg: avg.toFixed(1),
            totalReviewCount: totalReviewCount
          }
          project['assignedToUser'] = user;
        }
        project['approvedAt'] = approvedBid.updated_at;
        project['approvedAmount'] = approvedBid.bidAmount;
        if (project.costType === COST_TYPE.HOURLY) {
          if (project.milestones.length) {
            project.milestones.forEach(milestone => {
              let totalNumberOfHours = 0;
              if (milestone.timeSheet) {
                let timeSheet = JSON.parse(milestone.timeSheet)
                if (timeSheet && timeSheet.length) {
                  timeSheet.forEach(slot => {
                    totalNumberOfHours += slot.hoursCompleted
                  })
                }
              }
              milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
            })
          }
        } else {
          if (project.milestones.length) {
            project.milestones.forEach(milestone => {
              milestone['calculatedCost'] = (milestone.paymentToBeReleased / 100) * approvedBid.bidAmount;
            })
          }
        }
      }
      let reviewsCount = await this.reviewRepository.count({
        where: {
          role: userTokenData.role === ROLE.CLIENT ? ROLE.SERVICE_PROVIDER : ROLE.CLIENT,
          project: {
            id: project.id
          }
        }
      })

      project['isReviewed'] = false;
      if (reviewsCount) {
        project['isReviewed'] = true;
      }
      project['isSaved'] = false;
      let savedService = await this.savedService.findOne({
        where: {
          user: {
            id: userTokenData.appUserId
          },
          project: {
            id: project.id
          },
          role: userTokenData.role
        }
      })
      project['isSaved'] = savedService ? true : false;
      for (let index = 0; index < project.bids.length; index++) {
        const bid = project.bids[index];
        const user = bid.user
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = user.reviews.length
        // getting an avg
        let avg = 0;
        if (user.reviews && user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (user.reviews.length * 6)
        }
        user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        user['totalNumberOfProjects'] = await this.countUserProjects(user.id)
      }

      let avg = 0;
      let totalReviewCount = 0;
      const clientReviews = await this.reviewRepository.createQueryBuilder('review')
        .where({
          user: {
            id: project.user.id
          },
          role: ROLE.CLIENT
        })
        .getMany();

      if (clientReviews && clientReviews.length) {
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;

        clientReviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
        });
        totalReviewCount = clientReviews.length
        // getting an avg

        if (clientReviews && clientReviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (clientReviews.length * 4)
        }
      }

      project.user['reviewInfo'] = {
        totalAvg: avg.toFixed(1),
        totalReviewCount: totalReviewCount
      }

      let lastMilestoneAchievedDate = null;
      let nextMilestoneDue = 0;

      if (project.milestones.length) {
        let lastMilestoneAchieved = project.milestones.filter((item) => item.isCompleted)
          .sort((a, b) => b.updated_at.valueOf() - a.updated_at.valueOf());

        if (lastMilestoneAchieved.length) {
          lastMilestoneAchievedDate = lastMilestoneAchieved[0].updated_at || null
        }

        const nextMilestoneToComplete = project.milestones.filter(item => !item.isCompleted);

        if (nextMilestoneToComplete.length) {
          nextMilestoneDue = nextMilestoneToComplete[0].daysToComplete + nextMilestoneToComplete[0].buffer;
        }
      }
      project['lastMilestoneAchievedDate'] = lastMilestoneAchievedDate;
      project['nextMilestoneDue'] = nextMilestoneDue;

      return project;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  calculateProjectTotalCost(project) {
    project['totalEarned'] = 0;
    let approvedBid = project.bids.find(bid => bid.isApproved);
    // calculate if cost if project is hourly
    if (approvedBid) {
      if (project.costType === COST_TYPE.HOURLY) {
        if (project.milestones.length) {
          project.milestones.forEach(milestone => {
            let totalNumberOfHours = 0;
            if (milestone.timeSheet) {
              let timeSheet = JSON.parse(milestone.timeSheet)
              timeSheet.forEach(slot => {
                totalNumberOfHours += slot.hoursCompleted
              })
            }
            project['totalHours'] = totalNumberOfHours;
            milestone['calculatedCost'] = totalNumberOfHours * approvedBid.bidAmount
            project['totalEarned'] += milestone['calculatedCost']
          })
        }
      } else {
        project['totalEarned'] = approvedBid.bidAmount;
      }
    }
    return project['totalEarned'] as number;
  }

  /* New : ------------- */
  calculateMilestoneTotalCost(project, milestoneId) {
    let amount = 0;
    let approvedBid = project.bids.find(bid => bid.isApproved);
    // calculate if cost if project is hourly

    let milestone = project.milestones.find((milestone) => milestone.id === milestoneId);
    if (project.costType === COST_TYPE.HOURLY) {
      if (project.milestones.length) {
        if (project.costType === COST_TYPE.HOURLY) {
          if (project.milestones.length) {
            let milestone = project.milestones.find((milestone) => milestone.id === milestoneId);
            amount = (milestone?.daysToComplete * approvedBid.bidAmount);
          }
        }
      }
    } else {
      amount = approvedBid.bidAmount * milestone.paymentToBeReleased / 100; // payment to be released
    }
    return amount;
  }


  async updateProjectStatus(id, updateStatusBody, userTokenData) {
    try {
      let projectDetails = await this.projectRepository.findOne({
        where: {
          id: id
        },
        relations: ['user', 'bids', 'milestones']
      })
      projectDetails.status = updateStatusBody.status;

      if (updateStatusBody.status === PROJECT_STATUS.IN_PROGRESS) {
        projectDetails.projectStartDate = moment().toDate();
        // create a notification
        if (userTokenData.role === ROLE.ADMIN) {
          let bidDetails = await this.bidService.findOne({ where: { project: { id: id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
          if (bidDetails.assignedToUser) {
            // to assigned team members
            await this.notificationsService.create({
              userId: bidDetails.assignedToUser.id,
              role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
              title: 'Project has been Resumed by the Admin',
              description: 'The project has been resumed',
              serviceId: null,
              projectId: projectDetails.id + '',
              config: {
                isTeamMember: true,
                id: projectDetails.id,
                status: projectDetails.status,
                type: 'PROJECT'
              }
            })
          }
          await this.notificationsService.create({
            userId: bidDetails.user.id,
            role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
            title: 'Project has been Resumed by the Admin',
            description: 'The project has been resumed',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: false,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
          // notification to client
          await this.notificationsService.create({
            userId: projectDetails.user.id,
            role: ROLE.CLIENT,
            title: 'Project has been Resumed by the Admin',
            description: 'The project has been resumed',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        }
      }

      if (updateStatusBody.status === PROJECT_STATUS.COMPLETED) {
        let bidDetails = await this.bidService.findOne({ where: { project: { id: id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
        projectDetails.projectEndDate = moment().toDate();
        if (bidDetails.assignedToUser) {
          // to assigned team members
          await this.notificationsService.create({
            userId: bidDetails.assignedToUser.id,
            role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
            title: 'Payment for Milestone funded.',
            description: 'The payment for your milestone for a project funded.',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: true,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
          await this.notificationsService.create({
            userId: bidDetails.assignedToUser.id,
            role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
            title: 'Project has been completed',
            description: 'Your Project has been marked successfully completed by the client.',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: true,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        }
        await this.notificationsService.create({
          userId: bidDetails.user.id,
          role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
          title: 'Payment for Milestone received',
          description: 'The payment for your milestone for a project completed',
          serviceId: null,
          projectId: projectDetails.id + '',
          config: {
            isTeamMember: false,
            id: projectDetails.id,
            status: projectDetails.status,
            type: 'PROJECT'
          }
        })
        await this.notificationsService.create({
          userId: bidDetails.user.id,
          role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
          title: 'Project has been completed',
          description: 'Your Project has been marked successfully completed by the client.',
          serviceId: null,
          projectId: projectDetails.id + '',
          config: {
            isTeamMember: true,
            id: projectDetails.id,
            status: projectDetails.status,
            type: 'PROJECT'
          }
        })
        // get total project earned by the project 
        // get commission for the user
        let userRole = bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role;
        let commission = await this.commissionsService.calculateCommission(bidDetails.user.id, userRole);

        const calculatedProjectCost = this.calculateProjectTotalCost(projectDetails);
        let totalAmountEarned = calculatedProjectCost;
        // reduce commission
        if (commission) {
          totalAmountEarned = totalAmountEarned - (commission.percentage / 100 * calculatedProjectCost);
        }

        if (bidDetails.taxPercentage) {
          totalAmountEarned = totalAmountEarned - ((parseInt(bidDetails.taxPercentage) / 100) * calculatedProjectCost);
        }

        projectDetails.totalAmountNew = calculatedProjectCost;
        projectDetails.totalAmountAfterCommission = totalAmountEarned
        // add to payout
        await this.payoutsService.create({
          madeByClient: calculatedProjectCost,
          commission: commission ? commission.percentage / 100 * calculatedProjectCost : 0,
          payableToSP: totalAmountEarned,
          taxAmount: bidDetails.taxPercentage ? (parseInt(bidDetails.taxPercentage) / 100) * calculatedProjectCost : 0,
          netEarning: commission ? commission.percentage / 100 * calculatedProjectCost : 0,
          serviceId: null,
          projectId: projectDetails.id,
          clientUserId: projectDetails.user.id,
          serviceProviderUserId: bidDetails.user.id,
          milestoneId: null
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
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              type: 'PROJECT'
            }
          })
        }
        // add to user total earned and client's total spent
        let serviceProvider = await this.userService.findOne({
          where: {
            id: bidDetails.user.id
          }
        })
        serviceProvider.totalEarned = serviceProvider.totalEarned + totalAmountEarned;
        let totalHours = 0;
        if (projectDetails.costType === COST_TYPE.HOURLY) {
          let approvedBid = projectDetails.bids.find(bid => bid.isApproved);
          // calculate if cost if project is hourly
          if (approvedBid) {
            if (projectDetails.milestones.length) {
              projectDetails.milestones.forEach(milestone => {
                if (milestone.timeSheet) {
                  let timeSheet = JSON.parse(milestone.timeSheet)
                  timeSheet.forEach(slot => {
                    totalHours += slot.hoursCompleted
                  })
                }
              })
            }
          }
        }
        serviceProvider.totalHours = serviceProvider.totalHours + totalHours;
        await this.userService.save(serviceProvider);
        let client = await this.userService.findOne({
          where: {
            id: projectDetails.user.id
          }
        })
        client.totalSpent = client.totalSpent + calculatedProjectCost;
        await this.userService.save(client);
      }

      if (updateStatusBody.status === PROJECT_STATUS.CANCEL) {
        // create a notification
        if (userTokenData.role === ROLE.ADMIN) {
          let bidDetails = await this.bidService.findOne({ where: { project: { id: id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
          if (bidDetails.assignedToUser) {
            // to assigned team members
            await this.notificationsService.create({
              userId: bidDetails.assignedToUser.id,
              role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
              title: 'Project has been Canceled',
              description: 'The project has been canceled',
              serviceId: null,
              projectId: projectDetails.id + '',
              config: {
                isTeamMember: true,
                id: projectDetails.id,
                status: projectDetails.status,
                type: 'PROJECT'
              }
            })
          }
          await this.notificationsService.create({
            userId: bidDetails.user.id,
            role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
            title: 'Project has been Canceled',
            description: 'The project has been canceled',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: false,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
          // notification to client
          await this.notificationsService.create({
            userId: projectDetails.user.id,
            role: ROLE.CLIENT,
            title: 'Project has been Canceled',
            description: 'The project has been canceled',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        }
        if (userTokenData.role === ROLE.CLIENT) {
          let bidDetails = await this.bidService.findOne({ where: { project: { id: id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
          if (bidDetails.assignedToUser) {
            // to assigned team members
            await this.notificationsService.create({
              userId: bidDetails.assignedToUser.id,
              role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
              title: 'Project has been Canceled',
              description: 'The project has been canceled',
              serviceId: null,
              projectId: projectDetails.id + '',
              config: {
                isTeamMember: true,
                id: projectDetails.id,
                status: projectDetails.status,
                type: 'PROJECT'
              }
            })
          }
          await this.notificationsService.create({
            userId: bidDetails.user.id,
            role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
            title: 'Project has been Canceled',
            description: 'The project has been canceled',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: false,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        } else {
          // notification to client
          await this.notificationsService.create({
            userId: projectDetails.user.id,
            role: ROLE.CLIENT,
            title: 'Project has been Canceled',
            description: 'The project has been canceled',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        }
      }

      if (updateStatusBody.status === PROJECT_STATUS.INACTIVE) {
        // create a notification
        if (userTokenData.role === ROLE.CLIENT) {
          let bidDetails = await this.bidService.findOne({ where: { project: { id: id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
          if (bidDetails.assignedToUser) {
            // to assigned team members
            await this.notificationsService.create({
              userId: bidDetails.assignedToUser.id,
              role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
              title: `Your project: ${projectDetails.headline} has been put on hold.`,
              description: `Your project: ${projectDetails.headline} has been put on hold.`,
              serviceId: null,
              projectId: projectDetails.id + '',
              config: {
                isTeamMember: true,
                id: projectDetails.id,
                status: projectDetails.status,
                type: 'PROJECT'
              }
            })
          }
          await this.notificationsService.create({
            userId: bidDetails.user.id,
            role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
            title: 'Project has been put on hold',
            description: 'The project has been put on hold due to an issue raised',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              isTeamMember: false,
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        } else {
          // notification to client
          await this.notificationsService.create({
            userId: projectDetails.user.id,
            role: ROLE.CLIENT,
            title: 'Project has been put on hold',
            description: 'The project has been put on hold due to an issue raised',
            serviceId: null,
            projectId: projectDetails.id + '',
            config: {
              id: projectDetails.id,
              status: projectDetails.status,
              type: 'PROJECT'
            }
          })
        }
      }
      return await this.projectRepository.save(projectDetails);
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, userTokenData: any) {
    try {
      let projectDetails = await this.projectRepository.findOne({
        where: {
          id: id,
          user: {
            id: userTokenData.appUserId
          }
        }
      })
      if (!projectDetails) {
        throw new NotFoundException('Project Not Found');
      }
      // updating sub categories
      if (updateProjectDto.subCategories && updateProjectDto.subCategories.length) {
        projectDetails.subCategories = [...updateProjectDto.subCategories.map(subCat => { return { ...new SubCategory(), id: subCat } })]
      }

      projectDetails.bidEndingString = updateProjectDto.bidEndingString || projectDetails.bidEndingString;
      projectDetails.description = updateProjectDto.description || projectDetails.description;
      projectDetails.headline = updateProjectDto.headline || projectDetails.headline;
      projectDetails.costType = updateProjectDto.costType || projectDetails.costType;
      projectDetails.projectLength = updateProjectDto.projectLength || projectDetails.projectLength;
      projectDetails.serviceMaxCost = updateProjectDto.serviceMaxCost || projectDetails.serviceMaxCost;
      projectDetails.serviceMinCost = updateProjectDto.serviceMinCost || projectDetails.serviceMinCost;
      projectDetails.projectPref = updateProjectDto.projectPref || projectDetails.projectPref;
      projectDetails.englishLevel = updateProjectDto.englishLevel || projectDetails.englishLevel;
      projectDetails.biddingEndDate = updateProjectDto.biddingEndDate || projectDetails.biddingEndDate;

      if (updateProjectDto.milestones) {
        for (let index = 0; index < updateProjectDto.milestones.length; index++) {
          const milestone = updateProjectDto.milestones[index];
          let { timeSheet, deliverables, paymentToBeReleased, ...milestoneObj } = milestone;
          if (!milestone.id) {
            // create 
            let createInstance = await this.milestoneService.create({
              ...milestoneObj,
              project: {
                id: projectDetails.id
              },
              paymentToBeReleased: paymentToBeReleased,
              timeSheet: JSON.stringify(timeSheet),
              deliverables: JSON.stringify(deliverables)
            })

            await this.milestoneService.save(createInstance);
          } else {
            // save
            await this.milestoneService.save({ ...milestoneObj, paymentToBeReleased: paymentToBeReleased, timeSheet: JSON.stringify(timeSheet), deliverables: JSON.stringify(deliverables) });
          }
        }
      }
      await this.projectRepository.save(projectDetails);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async countUserProjects(userId: number) {
    try {
      let count = await this.projectRepository.createQueryBuilder('project')
        .innerJoin('project.bids', 'bids', 'bids.fk_id_user=:userId AND bids.is_approved=:isApproved', { userId, isApproved: true })
        .andWhere({
          status: PROJECT_STATUS.COMPLETED
        })
        .getCount()

      return count;
    } catch (err) {
      throw err;
    }
  }

  async searchProjectSubCategories(searchString) {
    try {
      let projects = await this.projectRepository.createQueryBuilder('project')
        .innerJoinAndSelect('project.subCategories', 'subCategories', `subCategories.keywords LIKE '%${searchString}%'`)
        .getMany()
      return _.uniq(_.flatten(projects.map(p => p.subCategories)), x => x.id);
    } catch (err) {
      throw err;
    }
  }

  // get(ProjectService).generateFakeProjects(20)
  async generateFakeProjects(number) {
    try {
      for (let index = 0; index < number; index++) {
        let costType = faker.helpers.arrayElement([COST_TYPE.FIXED_COST, COST_TYPE.HOURLY]);
        let subCategories = []
        let randomSubCategory = faker.datatype.number({
          'min': 1,
          'max': 9
        });
        for (let index = 0; index < randomSubCategory; index++) {
          subCategories.push({
            ...new SubCategory(),
            id: faker.helpers.arrayElement(Object.values(Array.from(Array(17).keys(), (v, k) => { return k + 1 })))
          })
        }
        let project: Partial<Project> = {
          user: {
            id: 1
          },
          headline: faker.lorem.sentence(5),
          description: faker.lorem.sentences(3),
          biddingEndDate: faker.date.recent(faker.helpers.arrayElement([10, 20, 30, 40])),
          projectStartDate: faker.date.future(1),
          projectEndDate: faker.date.future(2, moment().add(1, 'years').toDate()),
          costType: costType,
          status: faker.helpers.arrayElement(Object.values(PROJECT_STATUS)),
          projectPref: faker.helpers.arrayElement(Object.values(PROJECT_PREFS)),
          englishLevel: faker.lorem.sentence(6),
          projectLength: faker.lorem.sentence(3),
          canBid: true,
          serviceMinCost: parseInt(faker.finance.amount(10, 100)),
          totalAmount: 0,
          serviceMaxCost: parseInt(faker.finance.amount(100, 500)),
          subCategories: subCategories
        }
        // create project 
        let pC = await this.projectRepository.create(project);
        let p = await this.projectRepository.save(pC)
        for (let index = 0; index < faker.datatype.number({
          'min': 1,
          'max': 9
        }); index++) {
          let timeSheet = [];
          if (costType === COST_TYPE.HOURLY) {
            timeSheet = [];
          } else {
            let random = faker.datatype.number({
              'min': 1,
              'max': 9
            });
            for (let index = 0; index < random; index++) {
              timeSheet.push({
                title: faker.lorem.sentence(5),
                hoursCompleted: parseInt(faker.finance.amount(1, 5))
              })
            }
          }
          let deliverables = [];
          let random = faker.datatype.number({
            'min': 1,
            'max': 9
          });
          for (let index = 0; index < random; index++) {
            deliverables.push({
              title: faker.lorem.sentence(5),
              hoursCompleted: parseInt(faker.finance.amount(1, 5))
            })
          }
          let milestone: any = {
            title: faker.lorem.sentence(5),
            remarks: faker.lorem.sentence(5),
            timeSheet: JSON.stringify(timeSheet),
            isCompleted: false,
            deliverables: JSON.stringify(deliverables),
            daysToComplete: moment(p.projectEndDate).diff(p.projectStartDate, 'days'),
            paymentToBeReleased: faker.helpers.arrayElement([100]),
            buffer: parseInt(faker.finance.amount(1, 5)),
            project: {
              id: p.id
            },
          }
          let mc = await this.milestoneService.create(milestone)
          await this.milestoneService.save(mc)
        }
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateClientChatCount(id: number, chatCount: number, sendNotification) {
    try {
      let project = await this.projectRepository.findOne({
        where: {
          id: id
        },
        relations: ['user']
      })
      await this.projectRepository.update({
        id: id
      }, {
        unreadChatCountClient: chatCount === 0 ? 0 : project.unreadChatCountClient + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: project.user.id,
          role: project.user.role === ROLE.CLIENT ? project.user.role : project.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: project.id + '',
          config: {
            isTeamMember: false,
            id: project.id,
            status: project.status,
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

  async findMany(options: any) {
    return await this.projectRepository.find(options)
  }
  async updateProviderChatCount(id: number, chatCount: number, sendNotification) {
    try {
      let project = await this.projectRepository.findOne({
        where: {
          id: id
        },
        relations: ['bids', 'bids.user']
      })
      let approvedBid = project.bids.find((bid) => {
        if (bid.isApproved) {
          return bid;
        }
      })
      await this.projectRepository.update({
        id: id
      }, {
        unreadChatCountProvider: chatCount === 0 ? 0 : project.unreadChatCountProvider + chatCount
      })
      if (sendNotification && approvedBid) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: approvedBid.user.id,
          role: approvedBid.user.user.role !== ROLE.CLIENT ? approvedBid.user.role : approvedBid.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: project.id + '',
          config: {
            isTeamMember: false,
            id: project.id,
            status: project.status,
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

  remove(id: number) {
    return `This action removes a #${id} project`;
  }

  /* ----------------- New: Payment Flow Changes (Create Payout Every MileStone) --------------- */
  async createPaymentIntentForMileStone(id: number, bidderId: number) {
    try {
      /* Fetch MileStone */
      let milestone = await this.milestoneRepository.findOne({
        where: { id: id },
        relations: ['project']
      })
      let project = await this.findByProjectId(milestone.project.id);
      let amount = 0

      let approvedBid = project.bids.find(bid => bid.isApproved);
      if (!approvedBid) { /* Fetch info that will going to approve the bid */
        approvedBid = await this.bidService.findOne({ where: { id: bidderId } });
      } else {
        bidderId = null;
      }

      // calculate if cost if project is hourly
      if (approvedBid) {
        if (project.costType === COST_TYPE.HOURLY) {
          if (project.milestones.length) {
            let milestone = project.milestones.find((milestone) => milestone.id === id);
            amount = (milestone?.daysToComplete * approvedBid.bidAmount);
          }
        } else {
          amount = approvedBid.bidAmount * milestone.paymentToBeReleased / 100; // payment to be released
        }
      }

      /* Create Payment Intent For The MileStone */
      let paymentIntent = await this.paymentService.createPaymentIntent(amount, 'MileStone Payment', {
        isService: false,
        isMilestone: true,
        ...(bidderId && { bidderId })
      });

      milestone.intentSecret = paymentIntent.client_secret;
      await this.milestoneRepository.save(milestone);

      /* Return payment to client  */
      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount
      };
    } catch (err) {

      console.error("Error occurred while saving intent secret:", err);
      throw err;
    }
  }
}
