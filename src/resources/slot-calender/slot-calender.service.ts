import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { DeepPartial, Repository } from 'typeorm';
import { CreateSlotCalenderDto } from './dto/create-slot-calender.dto';
import { UpdateSlotCalenderDto } from './dto/update-slot-calender.dto';
import { SlotCalender } from './entities/slot-calender.entity';

@Injectable()
export class SlotCalenderService {
  constructor(
    @InjectRepository(SlotCalender) private slotCalenderRepository: Repository<SlotCalender>
  ) { }
  create(createSlotCalenderDto: CreateSlotCalenderDto) {
    return 'This action adds a new slotCalender';
  }

  async findAll() {
    return await this.slotCalenderRepository.find();
  }

  async fetchAllId() {
    return await this.slotCalenderRepository.find({
      select: ['id']
    });
  }
  findOne(id: number) {
    return `This action returns a #${id} slotCalender`;
  }

  update(id: number, updateSlotCalenderDto: UpdateSlotCalenderDto) {
    return `This action updates a #${id} slotCalender`;
  }

  remove(id: number) {
    return `This action removes a #${id} slotCalender`;
  }

  // seed calender data

  async seedOneTimeCalenderData() {
    try {
      let count = await this.slotCalenderRepository.count();
      let startDate = moment('2022-10-01');
      let endDate = moment('2022-11-01');
      if (!count) {
        let baseData: Array<DeepPartial<SlotCalender>> = [];
        let date = startDate;
        let currentDate = moment(date).format('YYYY-MM-DD');
        for (let index = 0; index < endDate.diff(startDate, 'days'); index++) {
          baseData.push(...[{
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '08:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '09:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '09:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '10:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '10:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '11:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '11:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '12:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '12:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '13:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '13:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '14:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '14:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '15:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '15:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '16:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '16:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '17:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '17:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '18:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '18:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '19:00').toDate()
          },
          {
            date: date.toDate(),
            slotStartTime: moment(currentDate + ' ' + '19:00').toDate(),
            slotEndTime: moment(currentDate + ' ' + '20:00').toDate()
          }])
          date = moment(date).add(1, 'day')
          let createInstance = await this.slotCalenderRepository.create(baseData);
          await this.slotCalenderRepository.save(createInstance);
        }
      }
    } catch (err) {
      throw err;
    }
  }
}
