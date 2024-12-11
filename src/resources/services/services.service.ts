import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { diskNames } from 'src/global/disk-names';
import { Between, FindManyOptions, In, IsNull, Not, Repository } from 'typeorm';
import { CategoryMaster } from '../category-master/entities/category-master.entity';
import { FileService } from '../file/file.service';
import { SubCategory } from '../sub-category/entities/sub-category.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import * as moment from 'moment';
import { BOOKING_STATUS, COST_TYPE, PROJECT_PREFS, ROLE, SERVICE_STATUS, TAX_MASTER_STATUS, TAX_TYPE } from 'src/global/enums';
import { BookServiceService } from '../book-service/book-service.service';
import { UserSlotCalenderService } from '../user-slot-calender/user-slot-calender.service';
import { User } from '../user/entities/user.entity';
import { SavedService } from '../saved/saved.service';
import { AccessTokenService } from '../access-token/access-token.service';
import { faker } from '@faker-js/faker';
import _ from 'underscore';
import { BookService } from '../book-service/entities/book-service.entity';
import { CategoryMasterModule } from '../category-master/category-master.module';
import { CategoryMasterService } from '../category-master/category-master.service';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(FileService) private readonly fileService: FileService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Service) private serviceRepository: Repository<Service>,
    @Inject(forwardRef(() => SavedService)) private readonly savedService: SavedService,
    @Inject(forwardRef(() => BookServiceService)) private readonly bookService: BookServiceService,
    @Inject(forwardRef(() => CategoryMasterService)) private readonly categoryMasterService: CategoryMasterService,
    @Inject(forwardRef(() => AccessTokenService)) private readonly accessTokenService: AccessTokenService,
  ) { }

  async create(createServiceDto: CreateServiceDto, userTokenData: any) {
    try {
      // creating a service
      let { subCategories, inclusions, nonInclusions, faq, ...createObject } = createServiceDto
      let serviceInstance = await this.serviceRepository.create({
        ...createObject, status: SERVICE_STATUS.DRAFT, inclusions: JSON.stringify(inclusions), nonInclusions: JSON.stringify(nonInclusions), faq: JSON.stringify(faq)
      });
      if (!serviceInstance.subCategories) {
        serviceInstance.subCategories = [...subCategories.map(subCat => { return { ...new SubCategory(), id: subCat } })]
      }
      serviceInstance.user = {
        id: userTokenData.appUserId
      }
      return await this.serviceRepository.save(serviceInstance);
    } catch (err) {
      throw err;
    }
  }

  async publishService(serviceId: number, status: SERVICE_STATUS) {
    try {
      await this.serviceRepository.update({
        id: serviceId
      }, {
        status: status
      })
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }
  async fetchServiceBySubCategories(subcategoryId: number, filters, limit, offset, userTokenData) {
    try {
      let whereObj: any = `subCategories.id=${subcategoryId}`
      if (subcategoryId == 0) {
        whereObj = {}
      }
      let andWhere = '1=1';
      if (userTokenData.role === ROLE.CLIENT) {
        andWhere = `user.id <> ${userTokenData.appUserId}`;
      }

      // filter logic
      let orderSorting: [string, "ASC" | "DESC"] = ['service.created_at', "ASC"]
      let typeWhere = '1=1';
      let rangeWhere = '1=1';
      let ratingWhere = '1=1';
      let locationWhere = '1=1';
      let lat = '';
      let lng = '';
      let ratingSelect = `(SELECT AVG(avg_review) from review where fk_id_user=user.id AND role IN ('${ROLE.SERVICE_PROVIDER}','${ROLE.SERVICE_PROVIDER_COMPANY}'))`;
      if (filters) {
        // sorting
        if (filters.sorting) {
          let keys = Object.keys(filters.sorting);
          if (keys.includes('createdAt')) {
            orderSorting = ['service.created_at', filters.sorting.createdAt || "ASC"]
          }
          if (keys.includes('serviceCost')) {
            orderSorting = ['service.serviceCost', filters.sorting.serviceCost || "ASC"]
          }
          if (keys.includes('rating')) {
            orderSorting = ['reviewAvg', filters.sorting.rating || "ASC"]
          }
        }

        // location
        if (filters.location) {
          locationWhere = `calculatedDistance <= user.availability_distance AND calculatedDistance <= ${filters.location.proximity}`
          lat = filters.location.lat;
          lng = filters.location.lng
        }

        // range logic
        if (filters.range) {
          let keys = Object.keys(filters.range);
          if (keys.includes('fixedPrice')) {
            rangeWhere = `service.cost_type='${COST_TYPE.FIXED_COST}' AND (service.service_cost BETWEEN ${filters.range.fixedPrice.minCost} AND ${filters.range.fixedPrice.maxCost})`
          }
          if (keys.includes('hourly')) {
            rangeWhere = `service.cost_type='${COST_TYPE.HOURLY}' AND service.service_cost BETWEEN ${filters.range.hourly.minCost} AND ${filters.range.hourly.maxCost}`
          }
          if (keys.includes('fixedPrice') && keys.includes('hourly')) {
            rangeWhere = `
          (service.cost_type='${COST_TYPE.FIXED_COST}' AND service.service_cost BETWEEN ${filters.range.fixedPrice.minCost} AND ${filters.range.fixedPrice.maxCost})
          OR (service.cost_type='${COST_TYPE.HOURLY}' AND service.service_cost BETWEEN ${filters.range.hourly.minCost} AND ${filters.range.hourly.maxCost})`
          }
        }

        // type of user filter
        if (filters.type) {
          if (filters.type === ROLE.SERVICE_PROVIDER) {
            typeWhere = `user.role = '${ROLE.SERVICE_PROVIDER}' AND user.is_team_member = false`;
          }
          if (filters.type === ROLE.SERVICE_PROVIDER_COMPANY) {
            typeWhere = `user.role = '${ROLE.SERVICE_PROVIDER_COMPANY}'`;
          }
        }

        // type rating
        if (filters.rating) {
          ratingWhere = `reviewAvg BETWEEN ${filters.rating.minRating} AND ${filters.rating.maxRating}`
        }

        // Online/Offsite Service
        if (["ONSITE", "OFFSITE"]?.includes(filters.serviceType)) {
          const category = await this.categoryMasterService.findByWhere({
            where:{
              associate: filters.serviceType,
            },
            relations: ['subCategory']
          })

          const subCategoryIds = []
          category.forEach(element => {
            element.subCategory.forEach(subCat => {
              subCategoryIds.push(subCat?.id)
            })
          });
          whereObj = `subCategories.id IN (${subCategoryIds.join(',')})`
        }
      }

      let services = await this.serviceRepository.createQueryBuilder('service')
        .addSelect(ratingSelect, 'reviewAvg')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=service.fk_id_user)`, 'calculatedDistance')
        
        .leftJoin('service.subCategories', 'subCategories')
        .addSelect(['subCategories.id','subCategories.keywords','subCategories.name','subCategories.code','subCategories.description'])

        .leftJoin('subCategories.categoryMaster', 'categoryMaster')
        .addSelect(['categoryMaster.id','categoryMaster.associate'])

        .leftJoinAndSelect('service.files', 'files')

        .leftJoin('service.user', 'user')
        .addSelect(['user.id', 'user.email','user.firstName','user.lastName','user.profilePicId','user.lat','user.lng','user.availabilityDistance','user.role'])

        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere(whereObj)
        .andWhere('service.status=:status', { status: SERVICE_STATUS.ACTIVE })
        .andWhere(andWhere)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .take(limit)
        .skip(offset)
        .orderBy(...orderSorting)
        .getRawAndEntities()


      let count = await this.serviceRepository.createQueryBuilder('service')
        .addSelect(ratingSelect, 'reviewAvg')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=service.fk_id_user)`, 'calculatedDistance')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere(whereObj)
        .andWhere('service.status=:status', { status: SERVICE_STATUS.ACTIVE })
        .andWhere(andWhere)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .getRawAndEntities()

      let respServices = services.entities;
      for (let index = 0; index < respServices.length; index++) {
        const service = respServices[index];
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (service.user.reviews && service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (service.user.reviews.length * 6)
        }
        service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        service['user']['totalServicesProvided'] = await this.getTotalNumberOfServicesProvided(service.user.id)
      }
      return {
        services: respServices,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchServiceByCategories(categoryId: number, filters, limit, offset, userTokenData) {
    try {
      const category = await this.categoryMasterService.findOne(categoryId)
      const subcategories = category.subCategory;
      const subCategoryIds = _.pluck(subcategories, 'id');
      let whereObj: any = `subCategories.id IN (${subCategoryIds.join(',')})`
      if (!subCategoryIds.length) {
        whereObj = {}
      }
      let andWhere = '1=1';
      if (userTokenData.role === ROLE.CLIENT) {
        andWhere = `user.id <> ${userTokenData.appUserId}`;
      }


      // filter logic
      let orderSorting: [string, "ASC" | "DESC"] = ['service.created_at', "ASC"]
      let typeWhere = '1=1';
      let rangeWhere = '1=1';
      let ratingWhere = '1=1';
      let locationWhere = '1=1';
      let lat = '';
      let lng = '';
      let ratingSelect = `(SELECT AVG(avg_review) from review where fk_id_user=user.id AND role IN ('${ROLE.SERVICE_PROVIDER}','${ROLE.SERVICE_PROVIDER_COMPANY}'))`;
      if (filters) {
        // sorting
        if (filters.sorting) {
          let keys = Object.keys(filters.sorting);
          if (keys.includes('createdAt')) {
            orderSorting = ['service.created_at', filters.sorting.createdAt || "ASC"]
          }
          if (keys.includes('serviceCost')) {
            orderSorting = ['service.serviceCost', filters.sorting.serviceCost || "ASC"]
          }
          if (keys.includes('rating')) {
            orderSorting = ['reviewAvg', filters.sorting.rating || "ASC"]
          }
        }

        // location
        if (filters.location) {
          locationWhere = `calculatedDistance <= user.availability_distance AND calculatedDistance <= ${filters.location.proximity}`
          lat = filters.location.lat;
          lng = filters.location.lng
        }

        // range logic

        if (filters.range) {
          let keys = Object.keys(filters.range);
          if (keys.includes('fixedPrice')) {
            rangeWhere = `service.cost_type='${COST_TYPE.FIXED_COST}' AND (service.service_cost BETWEEN ${filters.range.fixedPrice.minCost} AND ${filters.range.fixedPrice.maxCost})`
          }
          if (keys.includes('hourly')) {
            rangeWhere = `service.cost_type='${COST_TYPE.HOURLY}' AND service.service_cost BETWEEN ${filters.range.hourly.minCost} AND ${filters.range.hourly.maxCost}`
          }
          if (keys.includes('fixedPrice') && keys.includes('hourly')) {
            rangeWhere = `
          (service.cost_type='${COST_TYPE.FIXED_COST}' AND service.service_cost BETWEEN ${filters.range.fixedPrice.minCost} AND ${filters.range.fixedPrice.maxCost})
          OR (service.cost_type='${COST_TYPE.HOURLY}' AND service.service_cost BETWEEN ${filters.range.hourly.minCost} AND ${filters.range.hourly.maxCost})`
          }
        }
        // type of user filter
        if (filters.type) {
          if (filters.type === ROLE.SERVICE_PROVIDER) {
            typeWhere = `user.role = '${ROLE.SERVICE_PROVIDER}' AND user.is_team_member = false`;
          }
          if (filters.type === ROLE.SERVICE_PROVIDER_COMPANY) {
            typeWhere = `user.role = '${ROLE.SERVICE_PROVIDER_COMPANY}'`;
          }
        }

        // type rating

        if (filters.rating) {
          ratingWhere = `reviewAvg BETWEEN ${filters.rating.minRating} AND ${filters.rating.maxRating}`
        }
      }

      let services = await this.serviceRepository.createQueryBuilder('service')
        .addSelect(ratingSelect, 'reviewAvg')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=service.fk_id_user)`, 'calculatedDistance')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere(whereObj)
        .andWhere('service.status=:status', { status: SERVICE_STATUS.ACTIVE })
        .andWhere(andWhere)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .take(limit)
        .skip(offset)
        .orderBy(...orderSorting)
        .getRawAndEntities()


      let count = await this.serviceRepository.createQueryBuilder('service')
        .addSelect(ratingSelect, 'reviewAvg')
        .addSelect(`(SELECT ST_Distance_Sphere(point(${lat === '' ? 'user.lng' : lng}, ${lng === '' ? 'user.lng' : lat}),point(user.lng, user.lat)) * 0.000621371 from user where id=service.fk_id_user)`, 'calculatedDistance')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.user', 'user')
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoinAndSelect('user.profilePicId', 'profilePicId')
        .andWhere(whereObj)
        .andWhere('service.status=:status', { status: SERVICE_STATUS.ACTIVE })
        .andWhere(andWhere)
        .andWhere(rangeWhere)
        .andWhere(typeWhere)
        .andHaving(ratingWhere)
        .andHaving(locationWhere)
        .getRawAndEntities()

      let respServices = services.entities;
      for (let index = 0; index < respServices.length; index++) {
        const service = respServices[index];
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });
        let totalReviewCount = service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (service.user.reviews && service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (service.user.reviews.length * 6)
        }
        service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
        service['user']['totalServicesProvided'] = await this.getTotalNumberOfServicesProvided(service.user.id)
      }
      return {
        services: respServices,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async findAndCount(options: FindManyOptions<Service>) {
    try {
      return await this.serviceRepository.findAndCount(options)
    } catch (err) {
      throw err;
    }
  }

  async findAll(limit, offset, userTokenData: any) {
    try {
      let services = await this.serviceRepository.createQueryBuilder('service')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.user', 'user')
        .where({
          user: {
            id: userTokenData.appUserId
          }
        })
        .take(limit)
        .skip(offset)
        .getRawAndEntities()

      let count = await this.serviceRepository.createQueryBuilder('service')
        .leftJoinAndSelect('service.subCategories', 'subCategories')
        .leftJoinAndSelect('subCategories.categoryMaster', 'categoryMaster')
        .leftJoinAndSelect('service.files', 'files')
        .leftJoinAndSelect('service.user', 'user')
        .where({
          user: {
            id: userTokenData.appUserId
          }
        })
        .getCount()

      let respServices = services.entities;
      for (let index = 0; index < respServices.length; index++) {
        const service = respServices[index];
        // fetch booking for this service
        let numberOfTimesBooked = await this.bookService.count({
          where: {
            service: {
              id: service.id
            }
          }
        })
        service['numberOfTimesBooked'] = numberOfTimesBooked,
          service['protocallAssured'] = true
      }

      return {
        data: respServices,
        totalCount: count,
        totalPageCount: count ? Math.ceil(count / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async findOne(id: number, headers?: any) {
    try {
      // if authorization get bearer token check it
      let tokenData: any = null
      if (headers && headers.authorization) {
        let token = headers.authorization.substring(7)
        tokenData = await this.accessTokenService.findOne({
          where: {
            token
          },
          select: ['tokenData']
        })
        tokenData = tokenData.tokenData
      }
      let service = await this.serviceRepository.createQueryBuilder('service')
        .leftJoin('service.subCategories', 'subCategories')
        .addSelect(['subCategories.name', 'subCategories.description', 'subCategories.id'])
        .leftJoin('subCategories.categoryMaster', 'categoryMaster')
        .addSelect(['categoryMaster.name', 'categoryMaster.description', 'categoryMaster.faq', 'categoryMaster.id'])
        .leftJoinAndSelect('categoryMaster.taxMasters', 'taxMasters')
        .leftJoin('service.files', 'files')
        .addSelect('files.id')
        .leftJoin('service.user', 'user')
        .addSelect(['user.postcode', 'user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.description', 'user.created_at', 'user.activityStatus', 'user.totalHours', 'user.totalSpent', 'user.role'])
        .leftJoinAndSelect('user.reviews', 'reviews')
        .leftJoin('user.profilePicId', 'profilePicId')
        .addSelect('profilePicId.id')
        .where({
          id: id
        })
        .getOne()
      let taxMasters = _.uniq((_.flatten(_.pluck(_.pluck(service.subCategories, 'categoryMaster'), 'taxMasters'))), (x) => { return x.id });
      let serviceProvider = service.user;
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

      service['taxPercentage'] = appliedTax ? appliedTax.taxPercentage : 0;
      service['taxUniqueCode'] = appliedTax ? appliedTax.taxUniqueId : 'N/A';

      service['user']['totalServicesProvided'] = await this.getTotalNumberOfServicesProvided(service.user.id)
      // calculate avg reviews
      let totalReview1 = 0;
      let totalReview2 = 0;
      let totalReview3 = 0;
      let totalReview4 = 0;
      let totalReview5 = 0;
      let totalReview6 = 0;
      service.user['reviewInfo'] = {
        totalAvg: 0,
        totalReviewCount: 0
      }
      service['postedRole'] = service.user.role === ROLE.CLIENT ? service.user.secondaryRole : service.user.role;
      service['isSaved'] = false;
      service['numberOfTimesBooked'] = await this.bookService.countByServiceId(service.id, Not(BOOKING_STATUS.CANCELED));
      let completedBookServices = await this.bookService.findAll({
        where: {
          service: {
            id: service.id,
          },
          status: BOOKING_STATUS.COMPLETED
        },
        relations: ['invoice'],
      });
      let totalNumberOfHours = completedBookServices.map((bookService: BookService) => {
        return moment(bookService.invoice.serviceEndDate).diff(bookService.invoice.serviceStartDate, 'hours')
      }).reduce((accumulator: number, currentValue: number) => {
        return accumulator + currentValue;
      }, 0)
      service['totalNumberOfHours'] = totalNumberOfHours;
      if (headers && headers.authorization) {
        let savedService = await this.savedService.findOne({
          where: {
            user: {
              id: tokenData.appUserId
            },
            service: {
              id: service.id
            },
            role: tokenData.role
          },
          select: ['id']
        })
        service['isSaved'] = savedService ? true : false;
      }
      if (service.user.reviews) {
        service.user.reviews.forEach(review => {
          totalReview1 += review.review1
          totalReview2 += review.review2
          totalReview3 += review.review3
          totalReview4 += review.review4
          totalReview5 += review.review5
          totalReview6 += review.review6
        });

        let totalReviewCount = service.user.reviews.length
        // getting an avg
        let avg = 0;
        if (service.user.reviews && service.user.reviews.length) {
          avg = (totalReview1 + totalReview2 + totalReview3 + totalReview4 + totalReview5 + totalReview6) / (service.user.reviews.length * 6)
        }
        service.user['reviewInfo'] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount
        }
      }

      return {
        ...service,
        protocallAssured: true
      }
    } catch (err) {
      throw err;
    }
  }

  async save(obj) {
    try {
      return await this.serviceRepository.save(obj)
    } catch (err) {
      throw err;
    }
  }

  async getTotalNumberOfServicesProvided(serviceProviderId: number) {
    try {
      let services = await this.serviceRepository.createQueryBuilder('service')
        .innerJoin('service.bookServices', 'bookServices')
        .where({
          user: {
            id: serviceProviderId
          }
        })
        .select(['service.id', 'bookServices.id', 'bookServices.status'])
        .getMany()
      let result = 0;
      services.forEach(service => {
        service.bookServices?.forEach((item) => {
          if (item.status === "COMPLETED") {
            result += 1;
          }
        })
      })
      return result;
    } catch (err) {
      throw err;
    }
  }
  async update(id: number, updateServiceDto: UpdateServiceDto) {

    let { subCategories, inclusions, nonInclusions, faq, ...updateObject } = updateServiceDto;

    let serviceInstance = await this.serviceRepository.findOne({
      where: {
        id: id
      }
    })
    serviceInstance.headline = updateServiceDto.headline;
    serviceInstance.costType = updateObject.costType;
    serviceInstance.description = updateObject.description;
    serviceInstance.serviceCost = updateObject.serviceCost;
    serviceInstance.visitingCharges = updateObject.visitingCharges;
    serviceInstance.cancellationCharges = updateObject.cancellationCharges;
    serviceInstance.faq = JSON.stringify(faq);
    serviceInstance.nonInclusions = JSON.stringify(nonInclusions);
    serviceInstance.inclusions = JSON.stringify(inclusions);

    serviceInstance.subCategories = [...subCategories.map(subCat => { return { ...new SubCategory(), id: subCat } })]
    await this.serviceRepository.save(serviceInstance);
    return {
      success: true
    }
  }

  async fetchAllServices(status, searchString, startDate, endDate, limit, offset,orderKey, orderSeq: 'DESC' | 'ASC') {
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
        searchWhere = `(user.first_name LIKE '%${searchString}%' OR user.last_name LIKE '%${searchString}%' OR service.headline LIKE '%${searchString}%')`
      }

      orderSeq = orderSeq || 'DESC'
      orderKey = orderKey || 'created_at'

      let services = await this.serviceRepository.createQueryBuilder('service')
        .leftJoinAndSelect('service.user', 'user')
        .where(where)
        .andWhere(searchWhere)
        .take(limit)
        .skip(offset)
        .orderBy(`service.${orderKey}`, `${orderSeq}`)
        // .orderBy('service.created_at', 'DESC')
        .getManyAndCount()
      return {
        services: services[0],
        totalCount: services[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async totalServiceCount(startDate, endDate, userId, subCategoryIds) {
    try {
      let where = {
        created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      if (userId) {
        where['user'] = {
          id: userId
        }
      }
      if (subCategoryIds.length) {
        where['subCategories'] = {
          id: In(subCategoryIds)
        }
      }
      let serviceListedCount = await this.serviceRepository.count({
        where: { ...where, status: SERVICE_STATUS.ACTIVE }
      })
      return {
        serviceListedCount
      }
    } catch (err) {
      throw err;
    }
  }
  async uploadImages(files, serviceId) {
    try {
      // find service 
      let service = await this.serviceRepository.findOne({
        where: {
          id: serviceId
        }
      })
      for (let index = 0; index < files.services.length; index++) {
        const file = files.services[index];
        let fileEntry = await this.fileService.save(file.buffer, diskNames.SERVICES, file.originalname, 1, "0", file.mimetype)
        if (!service.files) {
          service.files = [fileEntry]
        } else {
          service.files = [...service.files, fileEntry]
        }
      }
      await this.serviceRepository.save(service);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  // get(ServicesService).generateFakeServiceData(20)
  async generateFakeServiceData(number) {
    try {
      for (let index = 0; index < number; index++) {
        let u = await this.userRepository.find({
          where: {
            role: In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY])
          }
        })
        await this.create({
          headline: faker.lorem.sentence(5),
          description: faker.lorem.sentences(5),
          costType: faker.helpers.arrayElement(Object.values(COST_TYPE)),
          serviceCost: parseInt(faker.finance.amount(10, 100)),
          visitingCharges: parseInt(faker.finance.amount(10, 20)),
          cancellationCharges: parseInt(faker.finance.amount(10, 25)),
          subCategories: faker.helpers.arrayElements(Object.values(Array.from(Array(17).keys(), (v, k) => { return k + 1 }))),
          inclusions: [faker.lorem.sentence(5), faker.lorem.sentence(5), faker.lorem.sentence(5)],
          nonInclusions: [faker.lorem.sentence(5), faker.lorem.sentence(5), faker.lorem.sentence(5)],
          faq: JSON.stringify([{ "question": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ?", "answer": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur esse cillum dolore eu fugiat nulla pariatur." },
          { "question": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ?", "answer": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur esse cillum dolore eu fugiat nulla pariatur." },
          { "question": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ?", "answer": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur esse cillum dolore eu fugiat nulla pariatur." }])
        }, { appUserId: faker.helpers.arrayElement(_.pluck(u, 'id')) })
      }
    } catch (err) {
      throw err;
    }
  }
}
