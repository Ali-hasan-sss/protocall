import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsWhere, ObjectID, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { UpdateAccessTokenDto } from './dto/update-access-token.dto';
import { AccessToken } from './entities/access-token.entity';

@Injectable()
export class AccessTokenService {
  constructor(
    @InjectRepository(AccessToken) private accessTokenRepository: Repository<AccessToken>,
  ) { }
  async create(createAccessTokenDto: CreateAccessTokenDto) {
    let createInstance = await this.accessTokenRepository.create(createAccessTokenDto);
    return await this.accessTokenRepository.save(createInstance)
  }
  async findOne(options: FindOneOptions) {
    return await this.accessTokenRepository.findOne(options);
  }

  async save(updateAccessToken: any) {
    return await this.accessTokenRepository.save(updateAccessToken);
  }

  async update(criteria: string | number | string[] | Date | ObjectID | number[] | Date[] | ObjectID[] | FindOptionsWhere<AccessToken>, partialEntity: QueryDeepPartialEntity<AccessToken>) {
    return await this.accessTokenRepository.update(criteria, partialEntity)
  }
}
