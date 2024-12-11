import { ConflictException, forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import * as moment from 'moment';
import { CreateUserSlotCalenderDto } from './dto/create-user-slot-calender.dto';
import { UpdateUserSlotCalenderDto } from './dto/update-user-slot-calender.dto';
import { UserSlotCalender } from './entities/user-slot-calender.entity';
import { Between, DeepPartial, FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { throws } from 'assert';
import * as _ from 'underscore';
import { BOOKING_STATUS, COMPANY_ROLE, ROLE, SLOT_STATUS } from 'src/global/enums';
import { CompanyUserMapping } from '../company-user-mapping/entities/company-user-mapping.entity';
import { BookServiceService } from '../book-service/book-service.service';

@Injectable()
export class UserSlotCalenderService {
  constructor(
    @Inject(forwardRef(() => BookServiceService)) private readonly bookService: BookServiceService,
    @InjectRepository(UserSlotCalender) private userSlotCalenderRepository: Repository<UserSlotCalender>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(CompanyUserMapping) private companyUserMappingRepository: Repository<CompanyUserMapping>,
  ) { }

  private readonly slotMap = {
    "eight": '8am-9am',
    "nine": '9am-10am',
    "ten": '10am-11am',
    "eleven": '11am-12pm',
    "twelve": '12pm-1pm',
    "thirteen": '1pm-2pm',
    "fourteen": '2pm-3pm',
    "fifteen": '3pm-4pm',
    "sixteen": '4pm-5pm',
    "seventeen": '5pm-6pm',
    "eighteen": '6pm-7pm',
    "nineteen": '7pm-8pm',
  }

  private readonly slotReverseMap = {
    '8am-9am': "eight",
    '9am-10am': "nine",
    '10am-11am': "ten",
    '11am-12pm': "eleven",
    '12pm-1pm': "twelve",
    '1pm-2pm': "thirteen",
    '2pm-3pm': "fourteen",
    '3pm-4pm': "fifteen",
    '4pm-5pm': "sixteen",
    '5pm-6pm': "seventeen",
    '6pm-7pm': "eighteen",
    '7pm-8pm': "nineteen",
  }

  create(createUserSlotCalenderDto: CreateUserSlotCalenderDto) {
    return 'This action adds a new userSlotCalender';
  }

  async findAll(options: FindManyOptions<UserSlotCalender>) {
    return await this.userSlotCalenderRepository.find(options)
  }

  findOne(id: number) {
    return `This action returns a #${id} userSlotCalender`;
  }

  update(id: number, updateUserSlotCalenderDto: UpdateUserSlotCalenderDto) {
    return `This action updates a #${id} userSlotCalender`;
  }

  remove(id: number) {
    return `This action removes a #${id} userSlotCalender`;
  }

  async count(option: FindManyOptions<UserSlotCalender>) {
    try {
      return await this.userSlotCalenderRepository.count(option);
    } catch (err) {
      throw err;
    }
  }

  async availableSlots(startDate: Date, endDate: Date, serviceProviderId: number) {
    try {
      let user = await this.userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.companies', 'companies', 'companies.role=:role', { role: COMPANY_ROLE.TEAM_MEMBER })
        .leftJoinAndSelect('companies.teamMember', 'teamMember')
        .andWhere({
          id: serviceProviderId
        })
        .getOne()

      let userIds: Array<number>;
      if (user.role === ROLE.SERVICE_PROVIDER_COMPANY) {
        // if service provider company
        userIds = user.companies.map(company => {
          return company.teamMember.id
        })
        for (let index = 0; index < userIds.length; index++) {
          const userId = userIds[index];
          // if user slot calender mapping in count not exist
          for (let index = 0; index < moment(endDate, 'YYYY-MM-DD').diff(moment(startDate, 'YYYY-MM-DD'), 'day') + 1; index++) {
            const count = await this.count({
              where: {
                date: moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate(),
                user: {
                  id: serviceProviderId
                }
              }
            })
            if (!count) {
              // if not map current one
              await this.mapServiceProviderForDay(userId, moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate());
            }
          }
        }
      } else {
        userIds = [serviceProviderId];
        // if user slot calender mapping in count not exist
        for (let index = 0; index < moment(endDate, 'YYYY-MM-DD').diff(moment(startDate, 'YYYY-MM-DD'), 'day') + 1; index++) {
          const count = await this.count({
            where: {
              date: moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate(),
              user: {
                id: serviceProviderId
              }
            }
          })
          if (!count) {
            // if not map current one
            await this.mapServiceProviderForDay(serviceProviderId, moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate());
          }
        }
      }

      let bookWhere: any = {
        service: {
          user: In(userIds)
        },
        status: BOOKING_STATUS.VISITING_CHARGES_PENDING,
        created_at: moment().subtract(5, 'minutes').toDate()
      }
      if (user.role === ROLE.SERVICE_PROVIDER_COMPANY) {
        bookWhere = {
          assignedToUser: In(userIds),
          status: BOOKING_STATUS.VISITING_CHARGES_PENDING,
          created_at: moment().subtract(5, 'minutes').toDate()
        }
      }
      // find slots booked for userIds
      let bookedServices = await this.bookService.findAll({
        where: bookWhere,
        relations: ['service']
      })

      if (bookedServices.length) {
        // get time slots for the user
        for (let index = 0; index < bookedServices.length; index++) {
          const bookedService = bookedServices[index];
          if (bookedService.slotRef) {
            await this.bookService.removeBookingById(bookedService.id);
          }
        }
      }

      let availableSlots = await this.findAll({
        where: {
          date: Between(moment(startDate).toDate(), moment(endDate).toDate()),
          user: {
            id: In(userIds)
          }
        }
      })
      // formatting the response
      let returnObject: any = {}
      availableSlots.map(slot => {
        let slotTimingsArray = []
        Object.keys(slot).map((key: string) => {
          if (!['date', 'id', 'availableSlots', 'bookedSlots', 'user'].includes(key)) {
            let findSlot = returnObject && returnObject[slot.date + ''] ? returnObject[slot.date + ''].find(slot => slot.slotRange == this.slotMap[key]) : null
            if (findSlot) {
              slotTimingsArray.push({
                slotRange: this.slotMap[key],
                status: findSlot.status === SLOT_STATUS.AVAILABLE ? SLOT_STATUS.AVAILABLE : slot[key]
              })
            } else {
              slotTimingsArray.push({
                slotRange: this.slotMap[key],
                status: slot[key]
              })
            }
          }
        })
        returnObject[slot.date + ''] = slotTimingsArray;
      })
      return {
        slots: returnObject
      }
    } catch (err) {
      throw err;
    }
  }

  async getAvailableSlotsByCategoryId(categoryIds: Array<String>, startDate: Date, endDate: Date, serviceProviderId: number) {
    try {
      let users = await this.companyUserMappingRepository.find({
        where: {
          company: {
            id: serviceProviderId
          },
          role: COMPANY_ROLE.TEAM_MEMBER
        },
        relations: ['teamMember', 'teamMember.categoryMaster']
      })
      

      let userIds: Array<number> = users.filter(user => {
        if (user.teamMember.categoryMaster) {
          for (let index = 0; index < user.teamMember.categoryMaster.length; index++) {
            const category = user.teamMember.categoryMaster[index];
            if (categoryIds.includes(category.id + '')) {
              return user;
            }
          }
        }
      }).map(user => {
        return user.teamMember.id
      });

      console.log(userIds)
      for (let index = 0; index < userIds.length; index++) {
        const userId = userIds[index];
        // if user slot calender mapping in count not exist
        for (let index = 0; index < moment(endDate, 'YYYY-MM-DD').diff(moment(startDate, 'YYYY-MM-DD'), 'day') + 1; index++) {
          const count = await this.count({
            where: {
              date: moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate(),
              user: {
                id: userId
              }
            }
          })
          if (!count) {
            // if not map current one
            await this.mapServiceProviderForDay(userId, moment(startDate, 'YYYY-MM-DD').add(index, 'day').toDate());
          }
        }
      }
      let bookWhere = {
        assignedToUser: In(userIds),
        status: BOOKING_STATUS.VISITING_CHARGES_PENDING,
        created_at: moment().subtract(5, 'minutes').toDate()
      }
      // find slots booked for userIds
      let bookedServices = await this.bookService.findAll({
        where: bookWhere,
        relations: ['service']
      })

      if (bookedServices.length) {
        // get time slots for the user
        for (let index = 0; index < bookedServices.length; index++) {
          const bookedService = bookedServices[index];
          if (bookedService.slotRef) {
            await this.bookService.removeBookingById(bookedService.id);
          }
        }
      }
      let availableSlots = await this.findAll({
        where: {
          date: Between(moment(startDate).toDate(), moment(endDate).toDate()),
          user: {
            id: In(userIds)
          }
        }
      })
      // formatting the response
      let returnObject: any = {}
      console.log(availableSlots)
      availableSlots.map(slot => {
        let slotTimingsArray = []
        Object.keys(slot).map((key: string) => {
          if (!['date', 'id', 'availableSlots', 'bookedSlots', 'user'].includes(key)) {
            let findSlot = returnObject && returnObject[slot.date + ''] ? returnObject[slot.date + ''].find(slot => slot.slotRange == this.slotMap[key]) : null
            if (findSlot) {
              slotTimingsArray.push({
                slotRange: this.slotMap[key],
                status: findSlot.status === SLOT_STATUS.AVAILABLE ? SLOT_STATUS.AVAILABLE : slot[key]
              })
            } else {
              slotTimingsArray.push({
                slotRange: this.slotMap[key],
                status: slot[key]
              })
            }
          }
        })
        console.log(slotTimingsArray)
        returnObject[slot.date + ''] = slotTimingsArray;
      })
      return {
        slots: returnObject
      }
    } catch (err) {
      throw err;
    }
  }

  async updateSlotAvailability(serviceProviderId, slotRequest: any) {
    try {
      let slots = slotRequest.slots
      // reverse formatting
      let slotsToBeUpdated = []
      Object.keys(slots).forEach(key => {
        let createSlotArray = slots[key].map(e => {
          let obj: any = {};
          obj['date'] = key;
          obj['slot'] = this.slotReverseMap[e.slotRange];
          obj['status'] = e.status;
          return obj;
        });

        slotsToBeUpdated = [...slotsToBeUpdated, ...createSlotArray]
      })
      // updating in bulk
      for (let index = 0; index < slotsToBeUpdated.length; index++) {
        const updatedSlot = slotsToBeUpdated[index];
        let objToUpdate: any = {}
        objToUpdate[updatedSlot.slot] = updatedSlot.status;
        await this.userSlotCalenderRepository.update({
          date: updatedSlot.date,
          user: {
            id: serviceProviderId
          }
        }, objToUpdate);
      }
      return {
        success: true
      };
    } catch (err) {
      throw err;
    }
  }

  async mapServiceProviderForDay(userId, date) {
    try {
      // creating 
      let createInstance = await this.userSlotCalenderRepository.create({
        user: {
          id: userId,
        },
        date: date
      })
      // saving
      return await this.userSlotCalenderRepository.save(createInstance)
    } catch (err) {
      throw err;
    }
  }

  async mapServiceProviderForOneMonth(userId: number, startingDate, endingDate) {
    try {
      let startDate = moment(startingDate, 'YYYY-MM-DD').startOf('month')
      let endDate = moment(endingDate, 'YYYY-MM-DD').endOf('month');
      let indexDate = startDate;
      let baseData: Array<DeepPartial<UserSlotCalender>> = [];
      for (let index = 0; index <= endDate.diff(startDate, 'days'); index++) {
        baseData.push({
          user: {
            id: userId,
          },
          date: indexDate.toDate()
        })
        indexDate = moment(indexDate).add(1, 'day');
      }
      // creating 
      let createInstance = await this.userSlotCalenderRepository.create(baseData)
      // saving
      return await this.userSlotCalenderRepository.save(createInstance)
    } catch (err) {
      throw err;
    }
  }

  async updateBookedService(slots: any, userId: number) {
    try {
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index]
        const key = Object.keys(slot)[0] as String;
        const value = this.slotReverseMap[slot[`${key}`]];
        let updateObject: any = {}
        updateObject[`${value}`] = SLOT_STATUS.BOOKED;
        // check if slot already booked
        let slotDetails = await this.userSlotCalenderRepository.findOne({
          where: {
            date: moment(`${key}`).startOf('day').toDate(), user: {
              id: userId
            }
          }
        })
        if (slotDetails[value] === SLOT_STATUS.BOOKED) {
          throw new HttpException('Slot already booked', 600)
        }
        await this.userSlotCalenderRepository.update({
          date: moment(`${key}`).startOf('day').toDate(),
          user: {
            id: userId
          }
        }, updateObject)
      }
    } catch (err) {
      throw err;
    }
  }
  async cancelBookedService(slots: any, userId: number) {
    try {
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index]
        const key = Object.keys(slot)[0] as String;
        const value = this.slotReverseMap[slot[`${key}`]];
        let updateObject: any = {}
        updateObject[`${value}`] = SLOT_STATUS.AVAILABLE;
        // check if slot already booked
        let slotDetails = await this.userSlotCalenderRepository.findOne({
          where: {
            date: moment(`${key}`).startOf('day').toDate(),
            user: {
              id: userId
            },
          },
          loadEagerRelations: false
        })
        if (slotDetails[value] === SLOT_STATUS.AVAILABLE) {
          throw new HttpException('Slot is Available', 601)
        }
        await this.userSlotCalenderRepository.update({
          date: moment(`${key}`).startOf('day').toDate(),
          user: {
            id: userId
          }
        }, updateObject)
      }
    } catch (err) {
      throw err;
    }
  }

  async checkIfSlotAvailable(userId, slotRef) {
    try {
      let where = '('
      for (let index = 0; index < slotRef.length; index++) {
        const date = Object.keys(slotRef[index])[0];
        const slotTime = '`' + slotRef[index][date] + '`';
        where = !index ? where + `(date = '${date}' AND ${slotTime} NOT IN ('${SLOT_STATUS.BOOKED}', '${SLOT_STATUS.REMOVED}'))`
          : where + ` AND (date = '${date}' AND ${slotTime} NOT IN ('${SLOT_STATUS.BOOKED}', '${SLOT_STATUS.REMOVED}'))`
      }
      where = where + `) AND fk_id_user=${userId}`;
      return await this.userSlotCalenderRepository.createQueryBuilder('userSlot').where(where).getCount()
    } catch (err) {
      throw err;
    }
  }
}
