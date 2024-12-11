import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device } from './entities/device.entity';

@Injectable()
export class DeviceService {
  constructor(@InjectRepository(Device) private deviceRepository: Repository<Device>) { }

  async create(createDeviceDto: CreateDeviceDto) {
    try {
      let { userId, ...createObj } = createDeviceDto;
      let createInstance = await this.deviceRepository.create({
        ...createObj,
        user: {
          id: userId
        }
      })
      return await this.deviceRepository.save(createInstance);
    } catch (err) {
      throw err
    }
  }

  async findAll(options: FindManyOptions<Device>) {
    return await this.deviceRepository.find(options)
  }

  async findOne(id: number) {
    try {
      return await this.deviceRepository.findOne({
        where: {
          id: id
        }
      })
    } catch (err) {
      throw err;
    }
  }

  update(id: number, updateDeviceDto: UpdateDeviceDto) {
    return `This action updates a #${id} device`;
  }

  async remove(id: number) {
    try {
      await this.deviceRepository.delete({
        id: id
      })
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }
}
