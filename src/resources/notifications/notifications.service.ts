import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { FindOneOptions, FindOptionsWhere, ObjectID, Repository } from 'typeorm';
import { DeviceService } from '../device/device.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { BookServiceService } from '../book-service/book-service.service';
import { ProjectService } from '../project/project.service';
import { BidService } from '../bid/bid.service';
import { BOOKING_STATUS, PROJECT_STATUS, ROLE } from 'src/global/enums';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() =>ProjectService)) private readonly projectService: ProjectService,
    @Inject(DeviceService) private deviceService: DeviceService,
    @Inject(forwardRef(() =>BookServiceService)) private readonly bookService: BookServiceService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) { }

  async create(createObject: CreateNotificationDto) {
    let createInstance = await this.notificationRepository.create({
      user: {
        id: createObject.userId
      },
      role: createObject.role,
      title: createObject.title,
      description: createObject.description,
      service: createObject.serviceId ? {
        id: createObject.serviceId
      } : null,
      project: createObject.projectId ? {
        id: createObject.projectId
      } : null,
      bookService: createObject.bookServiceId ? {
        id: createObject.bookServiceId
      } : null,
      config: JSON.stringify(createObject.config)
    })

    //  pushing notification
    let devices = await this.deviceService.findAll({
      where: {
        user: {
          id: createObject.userId
        }
      }
    })
    for (let index = 0; index < devices.length; index++) {
      const device = devices[index];
      await firstValueFrom(this.httpService.post(this.configService.get('FIRE_BASE_API_END_POINT'),
        {
          "data": {
            "notifee" : JSON.stringify({
              "title": `${createObject.title}`,
              "body": `${createObject.description}`
            })
          },
          "to": device.fcmToken,
          "direct_boot_ok": true,
          "content_available": true,
          "priority": "high"
        },
        {
          headers: {
            "Authorization": `key=${this.configService.get('FIRE_BASE_SECRET')}`,
            "Content-Type": "application/json"
          }
        }
      ))
    }
    return await this.notificationRepository.save(createInstance);
  }

 async getNotificationDetails(notification, userTokenData){
    let response;

    let config = JSON.parse(notification.config);
    
    if(config.type === "PROJECT" && config.id){
      const project = await this.projectService.findOne({
        where:{
          id: config.id
        }
      })

      if(project){
        let nav = null;
        if(project.status === PROJECT_STATUS.COMPLETED){
          nav = "/past-project"
        }
        if(project.status === PROJECT_STATUS.IN_PROGRESS){
          nav = "/active-project"
        }
        if(project.status === PROJECT_STATUS.POSTED && userTokenData.role !== ROLE.CLIENT){
          nav = "/projects"
        }
        if(project.status === PROJECT_STATUS.POSTED && userTokenData.role === ROLE.CLIENT){
          nav = "/project"
        }
        response = {
          id: config.id,
          type: "PROJECT",
          status: project.status,
          nav: nav,
          navProp: null,
          canNavigate: true
        }
      }
    }

    if(config.type === "SERVICE" && config.id){
      const service = await this.bookService.findOne({
        where:{
          id: config.id
        }
      })

      if(service){
        let nav = null;
        if(service.status === BOOKING_STATUS.COMPLETED && userTokenData.role !== ROLE.CLIENT){
          nav = "/history-service"
        }
        if(service.status === BOOKING_STATUS.COMPLETED && userTokenData.role === ROLE.CLIENT){
          nav = "/history-booking"
        }
        if(service.status === BOOKING_STATUS.SCHEDULED && userTokenData.role !== ROLE.CLIENT){
          nav = "/scheduled-service"
        }
        if(service.status === BOOKING_STATUS.SCHEDULED && userTokenData.role === ROLE.CLIENT){
          nav = "/scheduled-booking"
        }
        if(service.status === BOOKING_STATUS.PAYMENT_PENDING && userTokenData.role !== ROLE.CLIENT){
          nav = "/pending-service"              
        }
        if(service.status === BOOKING_STATUS.PAYMENT_PENDING && userTokenData.role === ROLE.CLIENT){
          nav = "/pending-booking"
        }
        response = {
          id: config.id,
          type: "SERVICE",
          status: service.status,
          nav: nav,
          navProp: { userId: service.service?.user?.id || null },
          canNavigate: true
        }
      }
    }

    if(config.type === "SUPPORT"){
      response = {
        id: null,
        type: "SUPPORT",
        status: null,
        nav: "/support",
        navProp: null,
        canNavigate: true
      }
    }

    return response || null;
  }

  async createAll(array:Array<any>){
    try{
      let createAllArray:Array<Partial<Notification>> = []
      array.forEach(a=>{
        createAllArray.push({
          user: {
            id: a.userId
          },
          role: a.role,
          title: a.title,
          description: a.description,
          service: a.serviceId ? {
            id: a.serviceId
          } : null,
          project: a.projectId ? {
            id: a.projectId
          } : null,
          bookService: a.bookServiceId ? {
            id: a.bookServiceId
          } : null,
          config: JSON.stringify(a.config)
        })
      })
      await this.notificationRepository.insert(createAllArray)
      return true;
    }catch(err){
      throw err;
    }
  }
  async findOneById(id, userTokenData: any){
    try {
      let notification = await this.notificationRepository.findOne({
        where:{
          id: id
        }
      })

      if(notification && notification.config){
        const response = await this.getNotificationDetails(notification, userTokenData);

        return {
          success: true,
          data: response || { canNavigate: false },
          notificationDetails: {
            ...notification,
            config: {
              ...(notification?.config && JSON.parse(notification?.config || "{}"))
            }
          }
        }
      } else {
        throw new NotFoundException("Notification not found!")
      }
      
    } catch (error) {
      throw error;
    }
  }

  async findAll(limit, offset, onlyUnread, userTokenData: any) {
    const [result, total] = await this.notificationRepository.findAndCount({
      where: {
        user: {
          id: userTokenData.appUserId
        },
        role: userTokenData.role,
        ...(onlyUnread ? { isRead:false } : {})
      },
      take: limit,
      skip: offset,
      order: {
        created_at: 'DESC',
        isRead: 'ASC'
      }
    })
    return  {
      data: result.map(notification=>({ ...notification, config: JSON.parse(notification.config || "{}") || {} })) || [],
      totalCount: total || 0
    }
  }

  async updateRead(id, userTokenData: any) {
    try {
      let notification = await this.notificationRepository.findOne({
        where:{
          id: id
        }
      })
      if(notification && notification.config){
       
      const response = await this.getNotificationDetails(notification, userTokenData);
      
      await this.notificationRepository.update({
        id: id
      }, {
        isRead: true
      })
      return {
        success: true,
        data: response || { canNavigate: false }
      }
    } else {
      throw new NotFoundException("Notification not found!")
    }


    } catch (err) {
      throw err;
    }
  }

  findOne(options: FindOneOptions<Notification>) {
    return this.notificationRepository.findOne(options)
  }

  async count(options){
    return await this.notificationRepository.count(options);
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  async remove(options: string | number | number[] | Date | ObjectID | string[] | Date[] | ObjectID[] | FindOptionsWhere<Notification>) {
    return await this.notificationRepository.delete(options)
  }

  async deleteNotification(id: number){
    return await this.notificationRepository.delete({
      id
    })
  }
}
