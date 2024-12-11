import { HttpException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GeneralUtils } from "src/utils/general-utils";
import { DeepPartial, In, IsNull, Like, Not, Repository } from "typeorm";
import { CategoryMasterService } from "../category-master/category-master.service";
import { CreateSubCategoryDto } from "./dto/create-sub-category.dto";
import { UpdateSubCategoryDto } from "./dto/update-sub-category.dto";
import { SubCategory } from "./entities/sub-category.entity";
import _ from "underscore";
import { TaxMaster } from "../tax-master/entities/tax-master.entity";
import { UserService } from "../user/user.service";
import { BookServiceService } from "../book-service/book-service.service";
import { ServicesService } from "../services/services.service";
import {
  BOOKING_STATUS,
  CATEGORY_ASSOCIATE,
  SERVICE_STATUS,
  SUB_CATEGORIES_STATUS,
} from "src/global/enums";
import { async } from "rxjs";
import { diskNames } from "src/global/disk-names";
import { FileService } from "../file/file.service";
@Injectable()
export class SubCategoryService {
  constructor(
    @Inject(CategoryMasterService)
    private categoryService: CategoryMasterService,
    @Inject(UserService) private userService: UserService,
    @InjectRepository(SubCategory)
    private subCategoryRepository: Repository<SubCategory>,
    @Inject(ServicesService) private services: ServicesService,
    @Inject(FileService) private readonly fileService: FileService
  ) { }
  async create(createSubCategoryDto: CreateSubCategoryDto) {
    try {
      let subCat = await this.subCategoryRepository.find({
        where: {
          code: createSubCategoryDto.name.toLowerCase(),
        },
      });
      if (subCat.length == 2) {
        throw new HttpException(`Tag already exist`, 455);
      }
      let { categoryMasterId, ...createObj } = createSubCategoryDto;
      let categoryMaster = await this.categoryService.findOne(categoryMasterId);
      let keywords = GeneralUtils.generateKeywords(categoryMaster.name);
      keywords.push(...GeneralUtils.generateKeywords(createObj.name));
      let createInstance = await this.subCategoryRepository.create({
        ...createObj,
        keywords: JSON.stringify(_.uniq(_.flatten(keywords))),
        code: createObj.name.toLowerCase(),
      });
      createInstance.categoryMaster = categoryMaster;
      return await this.subCategoryRepository.save(createInstance);
    } catch (err) {
      throw err;
    }
  }

  async findAll(status, searchString, limit, offset) {
    try {
      let where: any = {
        status: status,
        name:
          searchString !== "" && searchString !== undefined
            ? Like(`%${searchString}%`)
            : Not(IsNull()),
      };
      if (status === "ALL") {
        where = {
          name:
            searchString !== "" && searchString !== undefined
              ? Like(`%${searchString}%`)
              : Not(IsNull()),
        };
      }
      let categories = await this.subCategoryRepository.findAndCount({
        where: where,
        take: limit,
        skip: offset,
        order: {
          created_at: "DESC",
        },
      });
      return {
        skills: categories[0],
        totalCount: categories[1],
      };
    } catch (err) {
      throw err;
    }
  }

  async findOne(id: number) {
    try {
      return await this.subCategoryRepository.findOne({
        where: {
          id: id,
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateSubCategoryDto: UpdateSubCategoryDto) {
    try {
      let { categoryMasterId, ...updateObj } = updateSubCategoryDto;
      let subCategory = await this.subCategoryRepository.findOne({
        where: {
          id: id,
        },
        relations: ["categoryMaster"],
      });
      let keywords = JSON.parse(subCategory.keywords);
      if (updateObj.name) {
        keywords = GeneralUtils.generateKeywords(updateObj.name);
      }
      let categoryMasterObj = {};
      if (categoryMasterId) {
        let categoryMaster = await this.categoryService.findOne(
          categoryMasterId
        );
        keywords.push(GeneralUtils.generateKeywords(categoryMaster.name));
        categoryMasterObj = { id: categoryMaster.id };
      }
      return await this.subCategoryRepository.update(
        {
          id: id,
        },
        {
          ...updateObj,
          keywords: JSON.stringify(_.uniq(_.flatten(keywords))),
          categoryMaster: {
            id: categoryMasterId
              ? categoryMasterId
              : subCategory.categoryMaster.id,
          },
        }
      );
    } catch (err) {
      throw err;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} subCategory`;
  }

  async search(searchString, type) {
    try {
      let subCategories = await this.subCategoryRepository.find({
        where: {
          keywords: Like(`%${searchString}%`),
          categoryMaster: {
            associate: type === "onsite" ? CATEGORY_ASSOCIATE.ONSITE : CATEGORY_ASSOCIATE.OFFSITE
          }
        },
      });
      return subCategories;
    } catch (err) {
      throw err;
    }
  }

  async getTrendingSubCategories() {
    try {
      let sql =
        "SELECT COUNT(subCategoryId) as subCount, subCategoryId  from book_service LEFT JOIN service ON book_service.`fk_id_service` = service.id LEFT JOIN service_sub_categories_sub_category as sscm ON sscm.`serviceId`=service.id GROUP BY subCategoryId ORDER BY subCount DESC LIMIT 5;";
      let result = await this.subCategoryRepository.query(sql);
      return await this.subCategoryRepository.find({
        where: {
          id: In(_.pluck(result, "subCategoryId")),
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async seedOneTimeSubCategoryData() {
    try {
      let count = await this.subCategoryRepository.count();
      if (!count) {
        let baseData: Array<DeepPartial<SubCategory>> = [
          {
            name: "Toilet Cleaning",
            description: "Toilet Cleaning",
            code: "toilet-cleaning-plumb",
            categoryMaster: {
              id: 3,
            },
            keywords: JSON.stringify([
              "Toilet",
              "Cleaning",
              "Toilet Cleaning",
              "toilet cleaning",
              "plumbing",
              "Plumbing",
            ]),
          },
          {
            name: "Faucet Installation",
            description: "Faucet Installation",
            code: "faucet-installation-plumb",
            categoryMaster: {
              id: 3,
            },
            keywords: JSON.stringify([
              "faucet installation",
              "Faucet Installation",
              "Faucet",
              "Installation",
              "faucet",
              "installation",
              "plumbing",
              "Plumbing",
            ]),
          },
          {
            name: "Draining",
            description: "Draining",
            code: "draining-plumb",
            categoryMaster: {
              id: 3,
            },
            keywords: JSON.stringify([
              "draining",
              "Draining",
              "plumbing",
              "Plumbing",
            ]),
          },
          {
            name: "Drainage",
            description: "Drainage",
            code: "drainage-plumb",
            categoryMaster: {
              id: 3,
            },
            keywords: JSON.stringify([
              "drainage",
              "Drainage",
              "plumbing",
              "Plumbing",
            ]),
          },
          {
            name: "Repairs",
            description: "Repairs",
            code: "repair-plumb",
            categoryMaster: {
              id: 3,
            },
            keywords: JSON.stringify([
              "rep",
              "Repairs",
              "repairs",
              "plumbing",
              "Plumbing",
            ]),
          },
          {
            name: "Wood Cutting",
            description: "Wood Cutting",
            code: "wood-cutting-carp",
            categoryMaster: {
              id: 2,
            },
            keywords: JSON.stringify([
              "Wood Cutting",
              "wood cutting",
              "Wood",
              "Cutting",
              "wood",
              "cutting",
              "Carpentry",
              "carpentry",
            ]),
          },
          {
            name: "Furniture",
            description: "Furniture",
            code: "furniture-carp",
            categoryMaster: {
              id: 2,
            },
            keywords: JSON.stringify([
              "Furniture",
              "furniture",
              "Carpentry",
              "carpentry",
            ]),
          },
          {
            name: "Polishing",
            description: "Polishing",
            code: "polishing-carp",
            categoryMaster: {
              id: 2,
            },
            keywords: JSON.stringify([
              "Polishing",
              "polishing",
              "Carpentry",
              "carpentry",
            ]),
          },
          {
            name: "Repairs",
            description: "Repairs",
            code: "repair-carp",
            categoryMaster: {
              id: 2,
            },
            keywords: JSON.stringify([
              "rep",
              "Repairs",
              "repairs",
              "Carpentry",
              "carpentry",
            ]),
          },
          {
            name: "Metal Plating",
            description: "Metal Plating",
            code: "metal-plating-weld",
            categoryMaster: {
              id: 4,
            },
            keywords: JSON.stringify([
              "metal plating",
              "Metal Plating",
              "Metal",
              "Plating",
              "metal",
              "plating",
              "Welding",
              "welding",
            ]),
          },
          {
            name: "Grill Installation",
            description: "Grill Installation",
            code: "grill-installation-weld",
            categoryMaster: {
              id: 4,
            },
            keywords: JSON.stringify([
              "grill installation",
              "Grill Installation",
              "grill",
              "installation",
              "Welding",
              "welding",
            ]),
          },
          {
            name: "Repairs",
            description: "Repairs",
            code: "repair-weld",
            categoryMaster: {
              id: 4,
            },
            keywords: JSON.stringify([
              "rep",
              "Repairs",
              "repairs",
              "Welding",
              "welding",
            ]),
          },
          {
            name: "Metal Plating",
            description: "Metal Plating",
            code: "metal-plating-weld",
            categoryMaster: {
              id: 4,
            },
            keywords: JSON.stringify([
              "metal plating",
              "Metal Plating",
              "Metal",
              "Plating",
              "metal",
              "plating",
              "Welding",
              "welding",
            ]),
          },
          {
            name: "Design",
            description: "Design",
            code: "design-uiux",
            categoryMaster: {
              id: 1,
            },
            keywords: JSON.stringify([
              "Design",
              "Design",
              "ui",
              "ux",
              "UI",
              "UX",
            ]),
          },
          {
            name: "Figma",
            description: "Figma",
            code: "figma-uiux",
            categoryMaster: {
              id: 1,
            },
            keywords: JSON.stringify([
              "Figma",
              "figma",
              "ui",
              "ux",
              "UI",
              "UX",
            ]),
          },
          {
            name: "Adobe",
            description: "Adobe",
            code: "adobe-uiux",
            categoryMaster: {
              id: 1,
            },
            keywords: JSON.stringify([
              "Adobe",
              "adobe",
              "ui",
              "ux",
              "UI",
              "UX",
            ]),
          },
          {
            name: "Wireframing",
            description: "Wireframing",
            code: "Wireframing-uiux",
            categoryMaster: {
              id: 1,
            },
            keywords: JSON.stringify([
              "Wireframing",
              "wireframing",
              "ui",
              "ux",
              "UI",
              "UX",
            ]),
          },
        ];
        let createInstance = await this.subCategoryRepository.create(baseData);
        await this.subCategoryRepository.save(createInstance);
      }
    } catch (err) {
      throw err;
    }
  }

  async uploadImage(files, id) {
    try {
      let subCat = await this.subCategoryRepository.findOne({
        where: { id: id },
        relations: ["file"],
      });
      let subCatFileId: number = subCat.file ? subCat.file.id : null;
      if (files && files.image && files.image.length) {
        const file = files.image[0];
        let fileEntry = await this.fileService.save(
          file.buffer,
          diskNames.SUBCATEGORY,
          file.originalname,
          3,
          "0",
          file.mimetype
        );
        subCatFileId = fileEntry.id;
      }
      subCat.file = { id: subCatFileId };
      await this.subCategoryRepository.save(subCat);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchSubcategoriesByDistance(lat, lng, limit, offset) {
    try {
      let distance = 50; //miles
      // fetch all service providers and their bookings within the distance
      let serviceProviders =
        await this.userService.fetchUsersWithinSpecificDistance(
          lat,
          lng,
          distance
        );
      // fetch bookings of all serviceProviders
      let services = await this.services.findAndCount({
        where: {
          user: {
            id: In(_.pluck(serviceProviders, "id")),
          },
          status: SERVICE_STATUS.ACTIVE,
        },
        relations: ["bookServices", "subCategories"],
      });
      services[0] = services[0].filter((service) => {
        if (service.bookServices && service.bookServices.length) {
          service.bookServices = service.bookServices.filter((bookService) => {
            if ((bookService.status = BOOKING_STATUS.COMPLETED)) {
              return bookService;
            }
          });
          return service;
        }
      });
      const sortedServices = services[0].sort(function (one, other) {
        return one.bookServices.length - other.bookServices.length;
      });

      let subCategories = _.flatten(_.pluck(sortedServices, "subCategories"));
      let allSubCategories = await this.subCategoryRepository.findAndCount({
        where: {
          status: SUB_CATEGORIES_STATUS.ACTIVE,
          id: Not(In(subCategories?.map((subCat) => subCat?.id))),
        },
      });
      const processedData = _.uniq(
        [...subCategories, ...allSubCategories[0]],
        (x) => x.id
      );

      const data = GeneralUtils.limitOffset(
        processedData,
        limit || processedData?.length || 5,
        offset
      );

      return {
        data,
      };
    } catch (err) {
      throw err;
    }
  }
}
