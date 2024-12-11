import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { COST_TYPE, PROJECT_STATUS, ROLE } from 'src/global/enums';
import { FindOneOptions, MoreThan, Repository } from 'typeorm';
import { BidService } from '../bid/bid.service';
import { ProjectService } from '../project/project.service';
import { CreateSavedDto } from './dto/create-saved.dto';
import { UpdateSavedDto } from './dto/update-saved.dto';
import { Saved } from './entities/saved.entity';

@Injectable()
export class SavedService {
  constructor(@InjectRepository(Saved) private readonly savedRepository: Repository<Saved>,
    @Inject(forwardRef(() => ProjectService)) private readonly projectService: ProjectService,
    @Inject(BidService) private readonly bidService: BidService) { }
  create(createSavedDto: CreateSavedDto) {
    return 'This action adds a new saved';
  }

  async saveProject(projectId, userTokenData) {
    try {
      let createInstance = await this.savedRepository.create({
        project: {
          id: projectId
        },
        user: {
          id: userTokenData.appUserId
        },
        role: userTokenData.role
      })
      await this.savedRepository.save(createInstance);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async saveService(serviceId, userTokenData) {
    try {
      let createInstance = await this.savedRepository.create({
        service: {
          id: serviceId
        },
        user: {
          id: userTokenData.appUserId
        }
      })
      await this.savedRepository.save(createInstance);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchSavedServices(limit, offset, userTokenData) {
    try {
      // get service provider details with services that are booked


      let count = await this.savedRepository.createQueryBuilder('saved')
          .leftJoinAndSelect('saved.service', 'service')
          .andWhere({
            user: {
              id: userTokenData.appUserId
            }
          })
          .getCount()

      let savedServices = await this.savedRepository.createQueryBuilder('saved')
          .innerJoinAndSelect('saved.service', 'service', 'service.id IS NOT NULL')
          .leftJoinAndSelect('service.bookServices', 'bookService')
          .leftJoinAndSelect('service.files', 'files')
          .leftJoinAndSelect('service.subCategories', 'subCategories')
          .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
          .leftJoinAndSelect('bookService.user', 'user')
          .leftJoinAndSelect('user.profilePicId', 'clientProfilePicId')
          .leftJoinAndSelect('service.user', 'serviceUser')
          .leftJoinAndSelect('serviceUser.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
          .leftJoinAndSelect('bookService.reviews', 'serviceReviews', 'serviceReviews.fk_id_user=serviceUser.id')
          .leftJoinAndSelect('serviceUser.profilePicId', 'profilePicId')
          .andWhere({
            user: {
              id: userTokenData.appUserId
            }
          })
          .take(limit)
          .skip(offset)
          .getMany();

      // get reviews count
      for (let index = 0; index < savedServices.length; index++) {
        const savedService = savedServices[index];
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;
        savedService.service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6

          // @TODO calculate pending and paid amount;
        });
        let totalReviewCount = savedService.service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (savedService.service.user.reviews && savedService.service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (savedService.service.user.reviews.length * 6)
        }
        savedService.service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
          savedServices,
          count,
          totalCount: count || 0,
          totalPageCount: count ? Math.ceil(count/(limit||6)) : 0
         };

    } catch (err) {
      throw err;
    }
  }

  async fetchSavedProjects(limit, offset, userTokenData) {
    try {
      let bidCondition = 'bids.fk_id_user=:userId'
      if (userTokenData.isTeamMember) {
        bidCondition = 'bids.fk_id_assigned_to_user=:userId'
      }
      let bidCount = await this.bidService.count({
        where: {
          user: {
            id: userTokenData.appUserId
          }
        }
      })
      let where = '1=1';
      if (bidCount) {
        where = `project.id NOT IN (SELECT fk_id_project from bid where fk_id_user=${userTokenData.appUserId})`
      }
      let savedProjects = await this.savedRepository.createQueryBuilder('saved')
        .innerJoinAndSelect('saved.project', 'project', 'project.id IS NOT NULL AND project.status=:status AND project.bidding_end_date > :biddingEndDate', {
          status: PROJECT_STATUS.POSTED,
          biddingEndDate: moment().toDate()
        })
        .leftJoinAndSelect('project.bids', 'bids', bidCondition, { userId: userTokenData.appUserId })
        .leftJoinAndSelect('project.user', 'user')
        .leftJoinAndSelect('project.milestones', 'milestones')
        .leftJoinAndSelect('user.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.CLIENT })
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere(where)
        .andWhere({
          user: {
            id: userTokenData.appUserId
          }
        })
        .take(limit)
        .skip(offset)
        .getManyAndCount()
      if (!savedProjects.length) {
        return {
          savedProjects: [],
          totalCount: 0,
          totalPageCount: 0
        }
      }
      let response: any = []
      savedProjects[0].forEach(savedProject => {
        let p = savedProject.project;
        // calculate reviews
        p = this.projectService.calculateProjectExtraFields(p)
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let reviewLength = 0
        p.user.reviews.forEach(review => {
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
        if (p.user.reviews && reviewLength) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (reviewLength * 4)
        }
        p.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        p['savedProjectId'] = savedProject.id
        response.push(p)
      })
      return { 
        savedProjects: response,
        totalCount: savedProjects[1],
        totalPageCount: savedProjects[1] ? Math.ceil((savedProjects[1]||0)/(limit||6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  findAll() {
    return `This action returns all saved`;
  }

  async findOne(options: FindOneOptions<Saved>) {
    return await this.savedRepository.findOne(options);
  }

  update(id: number, updateSavedDto: UpdateSavedDto) {
    return `This action updates a #${id} saved`;
  }

  async remove(id: number) {
    return await this.savedRepository.delete({
      id: id
    })
  }
}
