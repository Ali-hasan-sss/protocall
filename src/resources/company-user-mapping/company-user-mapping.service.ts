import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CATEGORY_STATUS, COMPANY_ROLE, ROLE, USER_STATUS } from 'src/global/enums';
import { DeepPartial, FindManyOptions, Repository, SaveOptions } from 'typeorm';
import { BookServiceService } from '../book-service/book-service.service';
import { BookService } from '../book-service/entities/book-service.entity';
import { ProjectService } from '../project/project.service';
import { UserSlotCalenderService } from '../user-slot-calender/user-slot-calender.service';
import { CreateCompanyUserMappingDto } from './dto/create-company-user-mapping.dto';
import { UpdateCompanyUserMappingDto } from './dto/update-company-user-mapping.dto';
import { CompanyUserMapping } from './entities/company-user-mapping.entity';

@Injectable()
export class CompanyUserMappingService {

  constructor(
    @InjectRepository(CompanyUserMapping) private readonly companyUserMappingRepository: Repository<CompanyUserMapping>,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(UserSlotCalenderService) private readonly userSlotCalenderService: UserSlotCalenderService,
    @Inject(forwardRef(() => BookServiceService)) private readonly bookService: BookServiceService,
  ) { }

  async create(entity: any) {
    try {
      return await this.companyUserMappingRepository.create(entity)
    } catch (err) {
      throw err;
    }
  }

  async fetchTeamMembers(userId, subCategoryId) {
    try {
      let array: [string, string, string | null, any] = ['categoryMaster.subCategory', 'subCategory', null, null];
      if (subCategoryId !== 0) {
        array = [
          'categoryMaster.subCategory', 'subCategory',
          'subCategory.id=:subCategoryId', {
            subCategoryId
          }
        ]
      }
      let companyTeamMapping = await this.companyUserMappingRepository.createQueryBuilder('companies')
        .leftJoinAndSelect('companies.teamMember', 'teamMember')
        // .innerJoin('teamMember.categoryMaster').
        .innerJoinAndSelect('teamMember.categoryMaster', 'categoryMaster', 'categoryMaster.status=:status', { status: CATEGORY_STATUS.ACTIVE }) // Edit Mad : for Team Categories
        .innerJoin(...array)
        .leftJoinAndSelect('teamMember.profilePicId', 'profilePicId')
        .leftJoinAndSelect('teamMember.skills', 'skills')
        .leftJoinAndSelect('teamMember.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .andWhere({
          company: {
            id: userId
          },
          role: COMPANY_ROLE.TEAM_MEMBER
        })
        .andWhere('teamMember.activity_status = :status', { status: USER_STATUS.ACTIVE })
        .getMany()

      for (let index = 0; index < companyTeamMapping.length; index++) {
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        companyTeamMapping[index].teamMember.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = companyTeamMapping[index].teamMember.reviews.length
        // getting an avg
        let avg = 0;
        if (companyTeamMapping[index].teamMember.reviews && companyTeamMapping[index].teamMember.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (companyTeamMapping[index].teamMember.reviews.length * 6)
        }
        companyTeamMapping[index].teamMember['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        companyTeamMapping[index].teamMember['totalNumberOfProjects'] = await this.projectService.countUserProjects(companyTeamMapping[index].teamMember.id)
      }
      return companyTeamMapping;
    } catch (err) {
      throw err;
    }
  }


  async fetchTeamMembersBySlot(userId, subCategoryId, bookingId) {
    try {
      let array: [string, string, string | null, any] = ['categoryMaster.subCategory', 'subCategory', null, null];
      if (subCategoryId !== 0) {
        array = [
          'categoryMaster.subCategory', 'subCategory',
          'subCategory.id=:subCategoryId', {
            subCategoryId
          }
        ]
      }
      let bookService = await this.bookService.findOne({
        where: {
          id: bookingId
        }
      })
      if (!bookService) {
        throw new NotFoundException('Service is not booked.');
      }
      let removalId = null;
      let companyTeamMapping = await this.companyUserMappingRepository.createQueryBuilder('companies')
        .leftJoinAndSelect('companies.teamMember', 'teamMember')
        .innerJoin('teamMember.categoryMaster', 'categoryMaster')
        .innerJoin(...array)
        .leftJoinAndSelect('teamMember.profilePicId', 'profilePicId')
        .leftJoinAndSelect('teamMember.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .andWhere({
          company: {
            id: userId
          },
          role: COMPANY_ROLE.TEAM_MEMBER
        })
        .andWhere('teamMember.activity_status = :status', { status: USER_STATUS.ACTIVE })
        .getMany()

      let response: any = [];
      for (let index = 0; index < companyTeamMapping.length; index++) {
        let isUserAvailable = await this.userSlotCalenderService.checkIfSlotAvailable(companyTeamMapping[index].teamMember.id, JSON.parse(bookService.slotRef))
        if (!isUserAvailable) {
          // remove team member
          removalId = companyTeamMapping[index].teamMember.id
        }

        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;
        // check if the user is available for the given slot

        companyTeamMapping[index].teamMember.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = companyTeamMapping[index].teamMember.reviews.length
        // getting an avg
        let avg = 0;
        if (companyTeamMapping[index].teamMember.reviews && companyTeamMapping[index].teamMember.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (companyTeamMapping[index].teamMember.reviews.length * 6)
        }
        companyTeamMapping[index].teamMember['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        companyTeamMapping[index].teamMember['totalNumberOfProjects'] = await this.projectService.countUserProjects(companyTeamMapping[index].teamMember.id)

      }
      if (removalId) {
        companyTeamMapping = companyTeamMapping.filter(e => e.teamMember.id !== removalId)
      }
      return companyTeamMapping;
    } catch (err) {
      throw err;
    }
  }

  async fetchTeamMembersBySlotRef(userId, subCategoryIds: Array<number>, slotRef) {
    try {
      let companyTeamMapping = await this.companyUserMappingRepository.createQueryBuilder('companies')
        .leftJoinAndSelect('companies.teamMember', 'teamMember')
        .innerJoin('teamMember.categoryMaster', 'categoryMaster')
        .innerJoin('categoryMaster.subCategory', 'subCategory', `subCategory.id IN (${subCategoryIds.join(',')})`,)
        .leftJoinAndSelect('teamMember.profilePicId', 'profilePicId')
        .leftJoinAndSelect('teamMember.reviews', 'reviews', 'reviews.role=:role', { role: ROLE.SERVICE_PROVIDER })
        .andWhere({
          company: {
            id: userId
          },
          role: COMPANY_ROLE.TEAM_MEMBER
        })
        .andWhere('teamMember.activity_status = :status', { status: USER_STATUS.ACTIVE })
        .getMany()

      if (!companyTeamMapping.length) {
        throw new NotFoundException('Team Members not available');
      }
      let removalId = null;
      for (let index = 0; index < companyTeamMapping.length; index++) {
        let isUserAvailable = await this.userSlotCalenderService.checkIfSlotAvailable(companyTeamMapping[index].teamMember.id, slotRef)
        if (!isUserAvailable) {
          // remove team member
          removalId = companyTeamMapping[index].teamMember.id
        }
      }
      if (removalId) {
        companyTeamMapping = companyTeamMapping.filter(e => e.teamMember.id !== removalId)
      }
      return companyTeamMapping;
    } catch (err) {
      throw err;
    }
  }

  async findOne(options: FindManyOptions<CompanyUserMapping>) {
    try {
      return await this.companyUserMappingRepository.findOne(options)
    } catch (err) {
      throw err;
    }
  }
  async save(entity: any, options?: SaveOptions) {
    try {
      return await this.companyUserMappingRepository.save(entity, options)
    } catch (err) {
      throw err;
    }
  }
}
