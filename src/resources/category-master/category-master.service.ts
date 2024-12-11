import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BOOKING_STATUS, CATEGORY_ASSOCIATE, CATEGORY_STATUS, SERVICE_STATUS, SUB_CATEGORIES_STATUS } from 'src/global/enums';
import { GeneralUtils } from 'src/utils/general-utils';
import { DeepPartial, ILike, In, IsNull, Like, Not, Repository } from 'typeorm';
import { ServicesService } from '../services/services.service';
import { TaxMaster } from '../tax-master/entities/tax-master.entity';
import { UserService } from '../user/user.service';
import { CreateCategoryMasterDto } from './dto/create-category_master.dto';
import { UpdateCategoryMasterDto } from './dto/update-category_master.dto';
import { CategoryMaster } from './entities/category-master.entity';
import _ from 'underscore';
import { diskNames } from 'src/global/disk-names';
import { FileService } from '../file/file.service';

@Injectable()
export class CategoryMasterService {
  constructor(
    @InjectRepository(CategoryMaster) private categoryMasterRepository: Repository<CategoryMaster>,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    @Inject(forwardRef(() => ServicesService)) private services: ServicesService,
    @Inject(forwardRef(() => FileService)) private readonly fileService: FileService
  ) { }

  async create(createCategoryMasterDto: CreateCategoryMasterDto) {
    let categories = await this.categoryMasterRepository.find({
      where: {
        code: createCategoryMasterDto.name.toLowerCase(),
        associate: createCategoryMasterDto.associate
      }
    })
    if (categories.length) {
      throw new HttpException(`Category already exist`, 455);
    }
    let { faq, taxIds, ...createObj } = createCategoryMasterDto;
    let creation = await this.categoryMasterRepository.create({ ...createObj, faq: JSON.stringify(faq), code: createCategoryMasterDto.name.toLowerCase() });
    if (taxIds && taxIds.length) {
      creation.taxMasters = taxIds.map(id => {
        return {
          ...new TaxMaster(),
          id: id
        }
      })
    }
    return await this.categoryMasterRepository.save(creation);
  }

  async findAll(status, searchString, limit, offset) {
    let where: any = {
      status: status,
      name: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
    }
    if (status === 'ALL') {
      where = {
        name: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
      }
    }
    let categories = await this.categoryMasterRepository.findAndCount({
      where: where,
      take: limit,
      skip: offset,
      order: {
        created_at: 'DESC'
      }
    });
    return {
      categories: categories[0],
      totalCount: categories[1]
    }
  }

  async uploadImage(files, id) {
    try {
      let subCat = await this.categoryMasterRepository.findOne({ where: { id: id }, relations: ['file'] })
      let subCatFileId: number = subCat.file ? subCat.file.id : null;
      if (files && files.image && files.image.length) {
        const file = files.image[0];
        let fileEntry = await this.fileService.save(file.buffer, diskNames.SUBCATEGORY, file.originalname, 3, "0", file.mimetype)
        subCatFileId = fileEntry.id
      }
      subCat.file = { id: subCatFileId };
      await this.categoryMasterRepository.save(subCat);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchCategoriesByDistance(lat, lng, limit, offset) {
    try {
      let distance = 50; //miles
      // fetch all service providers and their bookings within the distance
      let serviceProviders = await this.userService.fetchUsersWithinSpecificDistance(lat, lng, distance);
      // fetch bookings of all serviceProviders
      let services = await this.services.findAndCount({
        where: {
          user: {
            id: In(_.pluck(serviceProviders, 'id')),
          },
          status: SERVICE_STATUS.ACTIVE
        },
        relations: ['bookServices', 'subCategories']
      })
      services[0] = services[0].filter((service) => {
        if (service.bookServices && service.bookServices.length) {
          service.bookServices = service.bookServices.filter((bookService) => {
            if (bookService.status = BOOKING_STATUS.COMPLETED) {
              return bookService;
            }
          })
          return service;
        }
      })
      const sortedServices = services[0].sort(function (one, other) {
        return one.bookServices.length - other.bookServices.length;
      })

      let subCategories = _.pluck(_.flatten(_.pluck(sortedServices, 'subCategories')), 'categoryMaster');

      let allCategories = await this.categoryMasterRepository.findAndCount({
        where: {
          status: CATEGORY_STATUS.ACTIVE,
          id: Not(In(subCategories?.map(subCat => subCat?.id)))
        }
      });
      const processedData = _.uniq([...subCategories, ...allCategories[0]], x => x.id);

      const data = GeneralUtils.limitOffset(
        processedData,
        limit || processedData?.length || 5,
        offset
      );

      return {
        data
      }

    } catch (err) {
      throw err;
    }
  }

  async fetchCategoriesByNatureOfWork(natureOfWork) {
    try {
      let where: any = {
        status: CATEGORY_STATUS.ACTIVE
      };
      if (natureOfWork) {
        where['associate'] = natureOfWork;
      }
      return await this.categoryMasterRepository.find({
        where,
        relations: ['subCategory', 'skills']
      })
    } catch (err) {
      throw err;
    }
  }

  async findOne(id: number) {
    return await this.categoryMasterRepository.findOne({
      where: {
        id: id
      },
      relations: ['subCategory', 'skills', 'taxMasters']
    })
  }

  async fetchTrendingCategory(startDate, endDate) {
    try {
      return await this.userService.getTopFiveCategories(startDate, endDate)
    } catch (err) {
      throw err;
    }
  }
  async fetchSubCategories(id): Promise<Array<number>> {
    try {
      let category = await this.categoryMasterRepository.findOne({
        where: {
          id: id
        },
        relations: ['subCategory']
      })
      return category.subCategory.map(subCat => { return subCat.id })
    } catch (err) {
      throw err;
    }
  }
  async findMany(ids: any) {
    ids = ids.split(',');
    let where = { id: Not(IsNull()), status: CATEGORY_STATUS.ACTIVE };
    if (ids.length) {
      where = {
        status: CATEGORY_STATUS.ACTIVE,
        id: In(ids.map((id) => {
          return id ? parseInt(id) : 0;
        }))
      }
    }
    return await this.categoryMasterRepository.find({
      where,
      relations: ['subCategory', 'skills']
    })
  }

  async update(id: number, updateCategoryMasterDto: UpdateCategoryMasterDto) {
    let { faq, taxIds, ...updateObj } = updateCategoryMasterDto;
    let faqUpdate: any = {
      faq: JSON.stringify(faq)
    }
    if (!faq) {
      faqUpdate = {}
    }
    if (taxIds && taxIds.length) {
      let cat = await this.categoryMasterRepository.findOne({
        where: {
          id: id
        }
      })
      cat.taxMasters = [];
      cat.taxMasters.push(...taxIds.map(taxId => {
        return {
          id: taxId,
          ...new TaxMaster()
        }
      }))
      await this.categoryMasterRepository.save(cat);
    }
    return await this.categoryMasterRepository.update({
      id: id
    }, {
      ...updateObj,
      ...faqUpdate
    })
  }

  remove(id: number) {
    return `This action removes a #${id} categoryMaster`;
  }

  async findByWhere(query: object) {
    let categories = await this.categoryMasterRepository.find({ ...query });
    return categories
  }

  public async seedOneTimeCategoryData() {
    try {

      let count = await this.categoryMasterRepository.count();

      if (!count) {
        let baseData: Array<DeepPartial<CategoryMaster>> = [
          {
            id: 1,
            name: 'UI/UX',
            description: 'UI/UX',
            associate: CATEGORY_ASSOCIATE.OFFSITE,
            code: 'uiux',
            faq: JSON.stringify(
              [{ "question": "this is carpentry question  1?", "answer": "this is uiux answer 1" }, { "question": "this is ui/ux question 2?", "answer": "this is uiux answer 2" }, { "question": "this is ui/ux question 3?", "answer": "this is uiux answer 3" }]
            )
          },
          {
            id: 2,
            name: 'Carpentry',
            description: 'Carpentry',
            code: 'carp',
            associate: CATEGORY_ASSOCIATE.ONSITE,
            faq: JSON.stringify(
              [{ "question": "this is carpentry question  1?", "answer": "this is carpentry answer 1" }, { "question": "this is carpentry question 2?", "answer": "this is carpentry answer 2" }, { "question": "this is carpentry question 3?", "answer": "this is carpentry answer 3" }]
            )
          },
          {
            id: 3,
            name: 'Plumbing',
            description: 'Plumbing',
            code: 'plum',
            associate: CATEGORY_ASSOCIATE.ONSITE,
            faq: JSON.stringify(
              [{ "question": "this is plumbing question  1?", "answer": "this is plumbing answer 1" }, { "question": "this is plumbing question 2?", "answer": "this is plumbing answer 2" }, { "question": "this is plumbing question 3?", "answer": "this is plumbing answer 3" }]
            )
          },
          {
            id: 4,
            name: 'Welding',
            description: 'welding',
            code: 'weld',
            associate: CATEGORY_ASSOCIATE.ONSITE,
            faq: JSON.stringify(
              [{ "question": "this is welding question  1?", "answer": "this is welding answer 1" }, { "question": "this is welding question 2?", "answer": "this is welding answer 2" }, { "question": "this is welding question 3?", "answer": "this is welding answer 3" }]
            )
          },
          {
            id: 5,
            name: 'Filing',
            description: 'Filing',
            code: 'Fil',
            associate: CATEGORY_ASSOCIATE.ONSITE,
            faq: JSON.stringify(
              [{ "question": "this is filing question  1?", "answer": "this is filing answer 1" }, { "question": "this is filing question 2?", "answer": "this is filing answer 2" }, { "question": "this is filing question 3?", "answer": "this is filing answer 3" }]
            )
          }
        ]
        let createInstance = await this.categoryMasterRepository.create(baseData);
        await this.categoryMasterRepository.save(createInstance);
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
