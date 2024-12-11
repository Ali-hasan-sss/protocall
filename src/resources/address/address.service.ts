import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressService {
  constructor(@InjectRepository(Address) private addressRepository: Repository<Address>) { }

  async create(createAddressDto: CreateAddressDto, userTokenData: any) {
    try {
      let createInstance = await this.addressRepository.create({ ...createAddressDto, user: { ...new User(), id: userTokenData.appUserId } });
      return await this.addressRepository.save(createInstance);
    } catch (err) {
      throw err;
    }
  }

  async addAddress(createAddressDto: CreateAddressDto) {
    try {
      let createInstance = await this.addressRepository.create(createAddressDto);
      return await this.addressRepository.save(createInstance);
    } catch (err) {
      throw err;
    }
  }

  findAll() {
    return `This action returns all address`;
  }

  async findOne(id: number) {
    try {
      if(id){
        const address = await this.addressRepository.findOne({
          where:{
            id
          }
        });
        if(address){
          return address  
        }
        throw new NotFoundException("Address not found!")
      }
      throw new BadRequestException("Provide address Id")
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateAddressDto: UpdateAddressDto) {
    try {
      return await this.addressRepository.save({ ...updateAddressDto, id: id });
    } catch (err) {
      throw err;
    }
  }

  async remove(id: number) {
    return await this.addressRepository.softDelete(id);
  }
}
