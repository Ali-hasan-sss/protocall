import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeneralUtils } from 'src/utils/general-utils';
import { Repository, DeepPartial, IsNull, Like, Not } from 'typeorm';
import { CategoryMasterService } from '../category-master/category-master.service';
import { CategoryMaster } from '../category-master/entities/category-master.entity';
import { SubCategory } from '../sub-category/entities/sub-category.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { Skills } from './skills.entity';
import _ from 'underscore';
@Injectable()
export class SkillsService {
  constructor(
    @Inject(CategoryMasterService) private categoryService: CategoryMasterService,
    @InjectRepository(Skills) private skillRepository: Repository<Skills>
  ) { }
  async seedOneTimeSkillData() {
    try {
      let count = await this.skillRepository.count()
      if (!count) {
        let baseData: Array<DeepPartial<Skills>> = [
          {
            name: 'Heavy load handling',
            description: 'Heavy load handling',
            code: 'Heavy-load-handling-plumb',
            categoryMaster: {
              id: 3
            },
            keywords: JSON.stringify([
              'Heavy', 'Load', 'Heavy Loading', 'cleaning', 'plumbing', 'Plumbing'
            ])
          },
          {
            name: 'Water Leakage Expert',
            description: 'Water Leakage Expert',
            code: 'Water-Leakage-Expert-plumb',
            categoryMaster: {
              id: 3
            },
            keywords: JSON.stringify([
              'Water leakage', 'water leakage', 'leakage', 'expert', 'plumbing', 'Plumbing'
            ])
          },
          {
            name: 'Handling chemicals',
            description: 'handling chemicals',
            code: 'handling-chemicals-plumb',
            categoryMaster: {
              id: 3
            },
            keywords: JSON.stringify([
              'chemicals', 'handling chemicals', 'handling', 'Plumbing'
            ])
          },
          {
            name: 'Working at heights',
            description: 'Working at heights',
            code: 'working-at-heights-plumb',
            categoryMaster: {
              id: 3
            },
            keywords: JSON.stringify([
              'heights', 'working at heights', 'plumbing', 'Plumbing'
            ])
          },
          {
            name: 'Power Tool Usage',
            description: 'Power Tool Usage',
            code: 'Power-Tool-Usage-carp',
            categoryMaster: {
              id: 2
            },
            keywords: JSON.stringify([
              'Power Tool Usage', 'power tools', 'tools', 'Cutting', 'wood', 'cutting', 'Carpentry', 'carpentry'
            ])
          },
          {
            name: 'Smoothing surfaces',
            description: 'Smoothing surfaces',
            code: 'Smoothing-surfaces-carp',
            categoryMaster: {
              id: 2
            },
            keywords: JSON.stringify([
              'Smoothing surfaces', 'smoothing', 'Carpentry', 'carpentry'
            ])
          },
          {
            name: 'Renovate old furniture',
            description: 'Renovate old furniture',
            code: 'Renovate-old-furniture-carp',
            categoryMaster: {
              id: 2
            },
            keywords: JSON.stringify([
              'Renovate', 'furniture', 'Carpentry', 'carpentry'
            ])
          },
          {
            name: 'Fire Cautious',
            description: 'Fire Cautious',
            code: 'Fire-Cautious-weld',
            categoryMaster: {
              id: 4
            },
            keywords: JSON.stringify([
              'fire', 'Fire Cautious', 'cautious', 'Plating', 'metal', 'plating', 'Welding', 'welding'
            ])
          },
          {
            name: 'Electrical Cautious',
            description: 'Electrical Cautious',
            code: 'Electrical-Cautious-weld',
            categoryMaster: {
              id: 4
            },
            keywords: JSON.stringify([
              'Electrical Cautious', 'Cautious', 'cautious', 'installation', 'Welding', 'welding'
            ])
          },
          {
            name: 'Pixel perfect',
            description: 'Pixel perfect',
            code: 'Pixel-perfect-uiux',
            categoryMaster: {
              id: 1
            },
            keywords: JSON.stringify([
              'Pixel perfect', 'pixel', 'ui', 'ux', 'UI', 'UX',
            ])
          },
          {
            name: 'Responsive',
            description: 'Responsive',
            code: 'Responsive-uiux',
            categoryMaster: {
              id: 1
            },
            keywords: JSON.stringify([
              'Responsive', 'responsive', 'ui', 'ux', 'UI', 'UX',
            ])
          },
          {
            name: 'Wireframing',
            description: 'Wireframing',
            code: 'Wireframing-uiux',
            categoryMaster: {
              id: 1
            },
            keywords: JSON.stringify([
              'Wireframing', 'wireframing', 'ui', 'ux', 'UI', 'UX',
            ])
          }
        ]
        let createInstance = await this.skillRepository.create(baseData);
        await this.skillRepository.save(createInstance);
      }
    } catch (err) {
      throw err;
    }
  }

  async create(createSkillDto: CreateSkillDto) {
    try {
      let skills = await this.skillRepository.find({
        where: {
          code: createSkillDto.name.toLowerCase(),
          categoryMaster: {
            id: createSkillDto.categoryMasterId
          }
        }
      })
      if (skills.length == 1) {
        throw new HttpException(`Skill already exist`, 455);
      }
      let { categoryMasterId, ...createObj } = createSkillDto;
      let categoryMaster = await this.categoryService.findOne(categoryMasterId);
      let keywords = GeneralUtils.generateKeywords(categoryMaster.name);
      keywords.push(...GeneralUtils.generateKeywords(createObj.name));
      let createInstance = await this.skillRepository.create({ ...createObj, keywords: JSON.stringify(_.uniq(_.flatten(keywords))), code: createObj.name.toLowerCase() });
      createInstance.categoryMaster = categoryMaster;
      return await this.skillRepository.save(createInstance);
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateSkillDto: UpdateSkillDto) {
    try {
      let { categoryMasterId, ...updateObj } = updateSkillDto;
      let skill = await this.skillRepository.findOne({
        where: {
          id: id
        },
        relations: ['categoryMaster']
      })
      let keywords = JSON.parse(skill.keywords);
      if (updateObj.name) {
        keywords = GeneralUtils.generateKeywords(updateObj.name);
      }
      if (updateObj.name) {
        keywords.push(GeneralUtils.generateKeywords(updateObj.name));
      }
      if (categoryMasterId) {
        let categoryMaster = await this.categoryService.findOne(categoryMasterId);
        keywords.push(GeneralUtils.generateKeywords(categoryMaster.name));
      }
      return await this.skillRepository.update({
        id: id
      }, {
        ...updateObj,
        keywords: JSON.stringify(_.uniq(_.flatten(keywords))),
        categoryMaster: {
          id: categoryMasterId ? categoryMasterId : skill.categoryMaster.id
        }
      })
    } catch (err) {
      throw err;
    }
  }

  async findAll(status, searchString, limit, offset) {
    try {
      let where: any = {
        status: status,
        name: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
      }
      if (status === 'ALL') {
        where = {
          name: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
        }
      }
      let categories = await this.skillRepository.findAndCount({
        where: where,
        take: limit,
        skip: offset,
        order: {
          created_at: 'DESC'
        }
      });
      return {
        skills: categories[0],
        totalCount: categories[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async findOne(id) {
    try {
      return await this.skillRepository.findOne({
        where: {
          id: id
        }
      })
    } catch (err) {
      throw err;
    }
  }
}
