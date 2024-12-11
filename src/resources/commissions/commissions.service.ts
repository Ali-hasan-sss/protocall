import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { COMMISSIONS_STATUS, ROLE } from 'src/global/enums';
import { In, IsNull, Like, Not, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { Commission } from './entities/commission.entity';

@Injectable()
export class CommissionsService {
  constructor(@InjectRepository(Commission) private commissionRepository: Repository<Commission>) { }
  async create(createCommissionDto: CreateCommissionDto) {
    try {
      let createCommission = await this.commissionRepository.create({
        description: createCommissionDto.description,
        status: createCommissionDto.status,
        isAppliedToAll: createCommissionDto.isAppliedToAll,
        isAppliedToSp: createCommissionDto.isAppliedToSp,
        isAppliedToSpc: createCommissionDto.isAppliedToSpc,
        percentage: createCommissionDto.percentage,
        role: createCommissionDto.role
      })
      if (!createCommissionDto.isAppliedToAll) {
        createCommission.users = createCommissionDto.userIds.map(id => {
          return {
            ...new User(),
            id: id
          }
        })
      }
      return await this.commissionRepository.save(createCommission)
    } catch (err) {
      throw err;
    }
  }

  async calculateCommission(userId: number, userRole: ROLE) {
    try { 
      const commission = await this.commissionRepository.findOne({
        where: {
          users: {
            id: userId
          },
          status: COMMISSIONS_STATUS.ACTIVE
        }
      })
      if (commission) {
        // return commission value for the user
        return commission;
      } else {
        // search for role specific commission
        let where: any = { isAppliedToSp: true };
        if (userRole === ROLE.SERVICE_PROVIDER_COMPANY) {
          where = { isAppliedToSpc: true }
        }
        const commission = await this.commissionRepository.findOne({
          where: { ...where, status: COMMISSIONS_STATUS.ACTIVE }
        })
        if (commission) {
          return commission;
        } else {
          const commission = await this.commissionRepository.findOne({
            where: { isAppliedToAll: true, status: COMMISSIONS_STATUS.ACTIVE }
          })
          if (commission) {
            return commission
          } else {
            return null;
          }
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async findAll(status, searchString, limit, offset) {
    try {
      let where: any = {
        status: status,
        description: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
      };
      if (status === 'ALL') {
        where = {
          description: searchString !== '' && searchString !== undefined ? Like(`%${searchString}%`) : Not(IsNull())
        }
      }
      let commissions = await this.commissionRepository.findAndCount({
        where: where,
        select: ['id', 'percentage', 'description', 'status', 'isAppliedToAll', 'isAppliedToSp', 'isAppliedToSpc', 'users', 'created_at', 'updated_at', 'role'],
        take: limit,
        skip: offset,
        relations: ['users'],
        order: {
          created_at: 'DESC'
        }
      })
      return {
        commissions: commissions[0],
        totalCount: commissions[1]
      }
    } catch (err) {
      throw err;
    }
  }

  async findOne(id: number) {
    try {
      let commission = await this.commissionRepository.findOne({
        where: {
          id: id
        },
        relations: ['users'],
        select: ['id', 'percentage', 'description', 'status', 'isAppliedToAll', 'isAppliedToSp', 'isAppliedToSpc', 'users', 'created_at', 'updated_at'],
      })
      if (!commission) {
        throw new NotFoundException('Commission not found');
      }
      return commission
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateCommissionDto: UpdateCommissionDto) {
    try {
      let commission = await this.commissionRepository.findOne({
        where: {
          id: id
        }
      })
      if (!commission) {
        throw new NotFoundException('Commission not found.')
      }
      commission.description = updateCommissionDto.description;
      commission.isAppliedToAll = updateCommissionDto.isAppliedToAll;
      commission.isAppliedToSp = updateCommissionDto.isAppliedToSp;
      commission.isAppliedToSpc = updateCommissionDto.isAppliedToSpc;
      commission.percentage = updateCommissionDto.percentage;
      commission.status = updateCommissionDto.status;

      if (updateCommissionDto.isAppliedToAll) {
        commission.users = []
      }

      if (updateCommissionDto.userIds) {
        commission.users = updateCommissionDto.userIds.map(id => {
          return {
            ...new User(),
            id: id
          }
        })
      }
      return await this.commissionRepository.save(commission)
    } catch (err) {
      throw err;
    }
  }

  async remove(id: number) {
    return await this.commissionRepository.delete({
      id: id
    })
  }
}
