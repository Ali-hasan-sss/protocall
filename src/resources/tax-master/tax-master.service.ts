import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { TAX_TYPE } from 'src/global/enums';
import { Between, ILike, Repository } from 'typeorm';
import { CreateTaxMasterDto } from './dto/create-tax-master.dto';
import { UpdateTaxMasterDto } from './dto/update-tax-master.dto';
import { TaxMaster } from './entities/tax-master.entity';

@Injectable()
export class TaxMasterService {
  constructor(@InjectRepository(TaxMaster) private readonly taxRepository: Repository<TaxMaster>) { }
  async create(createTaxMasterDto: any) {
    try {
      let existingTax = await this.taxRepository.findOne({
        where: {
          taxUniqueId: createTaxMasterDto.taxUniqueId
        }
      })
      if (existingTax) {
        throw new HttpException('Tax unique Id already exist', 400);
      }
      let taxMaster: Partial<TaxMaster> = {
        state: createTaxMasterDto.state,
        taxPercentage: createTaxMasterDto.taxPercentage,
        taxUniqueId: createTaxMasterDto.taxUniqueId,
        taxType: createTaxMasterDto.taxType,
        status: createTaxMasterDto.status
      }
      if (createTaxMasterDto.taxType === TAX_TYPE.GENERAL) {
        taxMaster['fromPostcode'] = createTaxMasterDto.fromPostcode;
        taxMaster['toPostcode'] = createTaxMasterDto.toPostcode;
      } else {
        taxMaster['zipCodes'] = JSON.stringify(createTaxMasterDto.zipCodes)
      }
      let createInstance = await this.taxRepository.create(taxMaster);
      return this.taxRepository.save(createInstance);
    } catch (err) {
      throw err;
    }
  }

  async findAll(searchString,fromDate, toDate, status, taxType, limit, offset) {
    try {
      let where: any = {};
      let likeWhere: any = undefined;
      if (fromDate && toDate) {
        where = {
          created_at: Between(moment(fromDate).startOf('day').toDate(), moment(toDate).endOf('day').toDate())
        }
      }
      if (status && status !== 'ALL') {
        where['status'] = status
      }
      if (taxType && taxType !== 'ALL') {
        where['taxType'] = taxType
      }
      if (searchString) {
        likeWhere = [{
          state: ILike(`%${searchString}%`)
        },
        {
          taxUniqueId: ILike(`%${searchString}%`)
        }]
      }
      let result = await this.taxRepository.createQueryBuilder('tax')
        .where(Object.keys(where).length ? where : '1=1')
        .andWhere(likeWhere ? likeWhere : '1=1')
        .take(limit)
        .skip(offset)
        .getManyAndCount();
      return {
        data: result[0],
        totalCount: result[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchAll(status) {
    try {
      let where: any = {};
      if (status && status !== 'ALL') {
        where['status'] = status
      }
      let result = await this.taxRepository.createQueryBuilder('tax')
        .where(Object.keys(where).length ? where : '1=1')
        .getMany();
      return {
        data: result,
      }
    } catch (err) {
      throw err;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} taxMaster`;
  }

  async update(id: number, updateTaxMasterDto: any) {
    try {
      let existingTax = await this.taxRepository.findOne({
        where: {
          id: id,
          taxType: updateTaxMasterDto.taxType
        }
      })
      if (!existingTax) {
        throw new NotFoundException('Tax not found');
      }
      existingTax.state = updateTaxMasterDto.state ? updateTaxMasterDto.state : existingTax.state,
      existingTax.taxPercentage = updateTaxMasterDto.taxPercentage ? updateTaxMasterDto.taxPercentage : existingTax.taxPercentage,
      existingTax.taxUniqueId = updateTaxMasterDto.taxUniqueId ? updateTaxMasterDto.taxUniqueId : existingTax.taxUniqueId,
      existingTax.taxType = updateTaxMasterDto.taxType ? updateTaxMasterDto.taxType : existingTax.taxType;
      existingTax.status = updateTaxMasterDto.status ? updateTaxMasterDto.status : existingTax.status;
      
      if (updateTaxMasterDto.taxType === TAX_TYPE.GENERAL) {
        existingTax['fromPostcode'] = updateTaxMasterDto.fromPostcode ? updateTaxMasterDto.fromPostcode : existingTax.fromPostcode;
        existingTax['toPostcode'] = updateTaxMasterDto.toPostcode ? updateTaxMasterDto.toPostcode : existingTax.toPostcode;
      } else {
        existingTax['zipCodes'] = updateTaxMasterDto.zipCodes ? JSON.stringify(updateTaxMasterDto.zipCodes) : existingTax.zipCodes;
      }
      return this.taxRepository.save(existingTax);
    } catch (err) {
      throw err;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} taxMaster`;
  }
}
