import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ROLE } from 'src/global/enums';
import { FindManyOptions, Repository } from 'typeorm';
import { BidService } from '../bid/bid.service';
import { BookServiceService } from '../book-service/book-service.service';
import { BookService } from '../book-service/entities/book-service.entity';
import { ProjectService } from '../project/project.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewService {

  constructor(
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    @Inject(forwardRef(()=>BookServiceService)) private readonly bookService: BookServiceService,
    @Inject(BidService) private readonly bidService: BidService
  ) { }
  private static readonly filterBy = {
    ALL: 0,
    SERVICE: 1,
    PROJECT: 2
  }
  async create(createReviewDto: CreateReviewDto, userTokenData: any) {
    try {
      let { userId, bookingId, projectId, ...createReview } = createReviewDto;
      let avg = 0;
      if (userTokenData.role === ROLE.SERVICE_PROVIDER) {
        avg = (createReview.review1 + createReview.review2 + createReview.review3 + createReview.review4) / 4
      } else {
        avg = (createReview.review1 + createReview.review2 + createReview.review3 + createReview.review4 + createReview.review5 + createReview.review6) / 6
      }

      if (bookingId && createReview.role === ROLE.SERVICE_PROVIDER_COMPANY) {
        let bookService = await this.bookService.findOne({
          where: {
            id: bookingId
          },
          relations: ['assignedToUser', 'service', 'service.user']
        });
        if (bookService.assignedToUser && bookService.service.user.role === ROLE.SERVICE_PROVIDER_COMPANY && userTokenData.role === ROLE.CLIENT) {
          let createInstance = await this.reviewRepository.create({
            user: {
              id: bookService.assignedToUser.id
            },
            bookService: {
              id: bookingId || null
            },
            project: {
              id: projectId || null
            },
            givenByUser: {
              id: userTokenData.appUserId
            },
            review1: createReview.review1,
            review2: createReview.review2,
            review3: createReview.review3,
            review4: createReview.review4,
            review5: createReview.review5,
            review6: createReview.review6,
            feedback: createReview.feedback,
            role: ROLE.SERVICE_PROVIDER,
            avg: avg
          });
          await this.reviewRepository.save(createInstance);
        }
      }

      if (projectId) {
        let bid = await this.bidService.getAssignedUser(projectId)
        if (bid.assignedToUser) {
          let createInstance = await this.reviewRepository.create({
            user: {
              id: bid.assignedToUser.id
            },
            bookService: {
              id: bookingId || null
            },
            project: {
              id: projectId || null
            },
            givenByUser: {
              id: userTokenData.appUserId
            },
            review1: createReview.review1,
            review2: createReview.review2,
            review3: createReview.review3,
            review4: createReview.review4,
            review5: createReview.review5,
            review6: createReview.review6,
            feedback: createReview.feedback,
            role: ROLE.SERVICE_PROVIDER,
            avg: avg
          });
          await this.reviewRepository.save(createInstance);
        }
      }


      let createInstance = await this.reviewRepository.create({
        user: {
          id: userId
        },
        bookService: {
          id: bookingId || null
        },
        project: {
          id: projectId || null
        },
        givenByUser: {
          id: userTokenData.appUserId
        },
        review1: createReview.review1,
        review2: createReview.review2,
        review3: createReview.review3,
        review4: createReview.review4,
        review5: createReview.review5,
        review6: createReview.review6,
        feedback: createReview.feedback,
        role: createReview.role,
        avg: avg
      });

      await this.reviewRepository.save(createInstance);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  findAll() {
    return `This action returns all review`;
  }

  async fetchReviewByServiceProviderId(serviceProviderId, serviceId, limit, offset, userTokenData) {
    try {
      let userReviews = []
      if (serviceId === 0) {
        userReviews = await this.reviewRepository.createQueryBuilder('review')
          .innerJoinAndSelect('review.givenByUser', 'givenByUser')
          .leftJoinAndSelect('givenByUser.profilePicId', 'profilePicId')
          .leftJoinAndSelect('givenByUser.address', 'address')
          .limit(limit)
          .offset(offset)
          .andWhere({
            user: {
              id: serviceProviderId
            }
          })
          .getMany()
      } else {
        userReviews = await this.reviewRepository.createQueryBuilder('review')
          .innerJoinAndSelect('review.givenByUser', 'givenByUser')
          .innerJoinAndSelect('review.bookService', 'bookService', 'bookService.fk_id_service=:serviceId', { serviceId })
          .leftJoinAndSelect('givenByUser.profilePicId', 'profilePicId')
          .leftJoinAndSelect('givenByUser.address', 'address')
          .limit(limit)
          .offset(offset)
          .andWhere({
            user: {
              id: serviceProviderId
            }
          })
          .getMany()
      }
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
        totalReview5 += review.review5
        totalReview6 += review.review6

        // @TODO calculate pending and paid amount;
      });
      let totalReviewCount = userReviews.length
      // getting an avg
      let avg = 0;
      if (userTokenData.role === ROLE.CLIENT) {
        // if client means service provider review
        avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (userReviews.length * 6)
      } else {
        avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4) / (userReviews.length * 4)
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

      return {
        userReviews,
        reviewInfo
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchReviewByUserId(userId, filterBy, limit, offset, userTokenData) {
    try {
      let whereClause = {};
      let andWhereClause = '';
      if (userTokenData.role === ROLE.CLIENT) {
        whereClause['role'] = ROLE.SERVICE_PROVIDER
      } else {
        whereClause['role'] = ROLE.CLIENT
      }

      if (filterBy === ReviewService.filterBy.SERVICE) {
        andWhereClause = 'fk_id_book_service IS NOT NULL'
      } else if (filterBy === ReviewService.filterBy.PROJECT) {
        andWhereClause = 'fk_id_project IS NOT NULL'
      } else {
        andWhereClause = '1=1'
      }
      let userReviews = []
      userReviews = await this.reviewRepository.createQueryBuilder('review')
        .innerJoinAndSelect('review.givenByUser', 'givenByUser')
        .leftJoinAndSelect('givenByUser.profilePicId', 'profilePicId')
        .leftJoinAndSelect('givenByUser.address', 'address')
        .limit(limit)
        .offset(offset)
        .andWhere({
          user: {
            id: userId
          },
          ...whereClause
        })
        .andWhere(andWhereClause)
        .getMany()

      let reviewInfo = await this.calculateTotalAvg(userId, whereClause['role'], andWhereClause)
      return {
        userReviews,
        reviewInfo
      }
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
      })
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

  findOne(id: number) {
    return `This action returns a #${id} review`;
  }

  update(id: number, updateReviewDto: UpdateReviewDto) {
    return `This action updates a #${id} review`;
  }

  async count(options: FindManyOptions<Review>) {
    try {
      return await this.reviewRepository.count(options)
    } catch (err) {
      throw err;
    }
  }
  remove(id: number) {
    return `This action removes a #${id} review`;
  }
}
