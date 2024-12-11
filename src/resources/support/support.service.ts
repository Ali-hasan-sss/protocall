import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as moment from 'moment';
import { diskNames } from 'src/global/disk-names';
import { CHAT_ENTITY_TYPE, CHAT_PROFILE_TYPE, PROJECT_STATUS, ROLE, SUPPORT_CATEGORY } from 'src/global/enums';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { BidService } from '../bid/bid.service';
import { FileService } from '../file/file.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectService } from '../project/project.service';
import { ReviewService } from '../review/review.service';
import { UserService } from '../user/user.service';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { Support } from './entities/support.entity';

@Injectable()
export class SupportService {

  constructor(@InjectRepository(Support) private readonly supportRepository: Repository<Support>,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(ReviewService) private readonly reviewService: ReviewService,
    @Inject(FileService) private readonly fileService: FileService,
    @Inject(BidService) private readonly bidService: BidService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService
  ) { }

  async fetchMany(options) {
    return await this.supportRepository.find(options)
  }

  async createFirebaseEntry(supportCreated, userTokenData) {
    try {
      let query = {
        type: CHAT_ENTITY_TYPE.SUPPORT,
        typeId: supportCreated.id,
        ownerType: userTokenData.role === ROLE.CLIENT
          ? CHAT_PROFILE_TYPE.CLI
          : CHAT_PROFILE_TYPE.PRO,
        ownerId: userTokenData.appUserId,
        userType: CHAT_PROFILE_TYPE.ADM,
        userId: 0
      }

      let queryId = `${query.type}-${query.typeId}-${query.ownerType}-${query.ownerId}-${query.userType}-${query.userId}`.toLowerCase();

      const db = getFirestore();
      await db.collection("chats").doc(queryId).set({
        active: true,
        type: query.type.toLowerCase(),
        id: Number(query.typeId),
        memberIds: [query.ownerId, query.userId],
        members: [
          {
            id: query.ownerId,
            roleGroup: userTokenData.role === ROLE.CLIENT ? "client" : "provider"
          },
          {
            id: query.userId,
            roleGroup: "admin"
          }
        ]
      });

      if (supportCreated.description) {
        await db.collection("chats").doc(queryId).collection("messages").add({
          createdAt: Timestamp.now(),
          memberId: query.ownerId || 0,
          roleGroup: userTokenData.role === ROLE.CLIENT ? "client" : "provider",
          text: supportCreated.description
        })
      }

      await this.supportRepository.update({
        id: supportCreated.id
      }, {
        chatIdDetails: JSON.stringify(query),
        chatId: queryId
      });
      return {
        query,
        queryId
      }
    } catch (error) {
      throw error;
    }
  }

  async create(createSupportDto: CreateSupportDto, userTokenData: any) {
    try {
      let { serviceId, projectId, isOpen } = createSupportDto;
      if (projectId) {
        await this.projectService.updateProjectStatus(projectId, { status: PROJECT_STATUS.INACTIVE }, userTokenData)
      }
      let support = await this.supportRepository.create({
        raisedBy: {
          id: userTokenData.appUserId
        },
        role: userTokenData.role,
        description: createSupportDto.description,
        service: {
          id: serviceId
        },
        project: {
          id: projectId
        },
        isOpen: isOpen,
        chatId: null
      })

      const supportCreated = await this.supportRepository.save(support)

      const { query, queryId } = await this.createFirebaseEntry(supportCreated, userTokenData);


      // create a notification for admin
      let adminId = await this.userService.findOne({
        where: {
          role: ROLE.ADMIN
        }
      })
      await this.notificationsService.create({
        userId: adminId.id,
        role: ROLE.ADMIN,
        title: 'Support Ticket raised',
        description: 'A new support ticket has been raised',
        serviceId: null,
        projectId: projectId + '',
        config: {
          type: 'PROJECT'
        }
      })

      return {
        ...supportCreated,
        chatIdDetails: query,
        chatId: queryId
      }

    } catch (err) {
      throw err;
    }
  }

  async createGenericTicket(title, description, userTokenData) {
    try {
      let create = await this.supportRepository.create({
        isOpen: true,
        description,
        title,
        raisedBy: userTokenData.appUserId,
        role: userTokenData.role,
        category: SUPPORT_CATEGORY.OTHER
      })
      const supportCreated = await this.supportRepository.save(create);

      const { query, queryId } = await this.createFirebaseEntry(supportCreated, userTokenData);

      // create a notification for admin
      let adminId = await this.userService.findOne({
        where: {
          role: ROLE.ADMIN
        }
      })
      await this.notificationsService.create({
        userId: adminId.id,
        role: ROLE.ADMIN,
        title: 'Support Ticket raised',
        description: 'A new support ticket has been raised',
        serviceId: null,
        projectId: null,
        config: {
          type: 'OTHER'
        }
      })

      return {
        ...supportCreated,
        chatIdDetails: query,
        chatId: queryId
      }
    } catch (err) {
      throw err;
    }
  }

  async fetchServiceProviderSupportTickets(isOpen, limit, offset, userTokenData: any) {
    try {
      let supportTickets = await this.supportRepository.createQueryBuilder('support')
        .leftJoinAndSelect('support.project', 'project')
        .leftJoinAndSelect('project.user', 'clientUser')
        .leftJoinAndSelect('project.bids', 'bids', 'bids.is_approved=:isApproved', { isApproved: true })
        .leftJoinAndSelect('bids.user', 'user')
        .andWhere({
          role: userTokenData.role,
          raisedBy: {
            id: userTokenData.appUserId
          },
          isOpen: isOpen
        })
        .take(limit)
        .skip(offset)
        .getMany()

      let count = await this.supportRepository.createQueryBuilder('support')
        .leftJoinAndSelect('support.project', 'project')
        .leftJoinAndSelect('project.user', 'clientUser')
        .leftJoinAndSelect('project.bids', 'bids', 'bids.is_approved=:isApproved', { isApproved: true })
        .leftJoinAndSelect('bids.user', 'user')
        .andWhere({
          role: userTokenData.role,
          raisedBy: {
            id: userTokenData.appUserId
          },
          isOpen: isOpen
        })
        .getRawAndEntities()

      for (let index = 0; index < supportTickets.length; index++) {
        const supportTicket = supportTickets[index];
        if (supportTicket.project) {
          let project = supportTicket.project;
          if (userTokenData.role === ROLE.SERVICE_PROVIDER || userTokenData.role === ROLE.SERVICE_PROVIDER_COMPANY) {
            // client review
            supportTicket.project['review'] = await this.reviewService.calculateTotalAvg(project.user.id, ROLE.CLIENT, '1=1')
          } else {
            // service provider review
            let approvedBid = project.bids.find(bid => bid.isApproved);
            if (approvedBid) {
              supportTicket.project['review'] = await this.reviewService.calculateTotalAvg(approvedBid.user.id, approvedBid.user.role, '1=1')
            }
          }
        }
        let project = supportTicket.project;
        supportTicket['chatIdDetails'] = JSON.parse(supportTicket.chatIdDetails || "null");
      }
      return {
        data: supportTickets,
        totalCount: count.entities.length,
        totalPageCount: count.entities.length ? Math.ceil(count.entities.length / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async updateIsOpen(id, isOpen, userTokenData) {
    try {
      return await this.supportRepository.update({
        id: id
      }, {
        isOpen: isOpen
      })
    } catch (err) {
      throw err;
    }
  }

  async totalSupportCount(startDate, endDate, userId, subCategoryIds) {
    try {
      let where = {
        created_at: Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      if (userId) {
        where['raisedBy'] = {
          id: userId
        }
        where['role'] = In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY])
      }
      if (subCategoryIds.length) {
        let projectIds = await this.projectService.getProjectIdsBySubcategories(subCategoryIds)
        where['project'] = {
          id: In(projectIds)
        }
      }

      let supportTicketTotalCount = await this.supportRepository.createQueryBuilder('support')
        .where(where)
        .getCount()

      let supportTicketIsOpenCount = await this.supportRepository.createQueryBuilder('support')
        .where({ ...where, isOpen: true })
        .getCount()

      let supportTicketIsClosedCount = await this.supportRepository.createQueryBuilder('support')
        .where({ ...where, isOpen: false })
        .getCount()

      return {
        supportTicketTotalCount,
        supportTicketIsOpenCount,
        supportTicketIsClosedCount
      }
    } catch (err) {
      throw err;
    }
  }

  async findAll(searchString, isOpen, role, limit, offset, startDate, endDate,orderKey, orderSeq: 'DESC' | 'ASC') {
    try {
      let where: any = {};
      if (isOpen !== '' && isOpen !== undefined) {
        where = {};
        where['isOpen'] = (isOpen === 'true')
      }
      if (role !== 'ALL') {
        where['role'] = role
      }
      if (startDate && endDate) {
        where['created_at'] = Between(moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate())
      }
      orderSeq = orderSeq || 'DESC'
      orderKey = orderKey || 'created_at'

      let supportTickets: any = [];
      if (!searchString) {
        supportTickets = await this.supportRepository.findAndCount({
          where: where,
          take: limit,
          skip: offset,
          order: {
            [orderKey]: orderSeq
          }
        })
      } else {
        supportTickets = await this.supportRepository.createQueryBuilder('sup')
          .leftJoinAndSelect('sup.raisedBy', 'user')
          .leftJoinAndSelect('sup.supportFile', 'supportFile')
          .where(where)
          .andWhere(`(sup.description LIKE '%${searchString}%' OR user.first_name LIKE '%${searchString}%' OR user.first_name LIKE '%${searchString}%' OR sup.category LIKE '%${searchString}%')`)
          // .orderBy('sup.created_at', 'DESC')
          .orderBy(`sup.${orderKey}`, `${orderSeq}`)
          .getManyAndCount()
      }
      return {
        supportTickets: supportTickets[0],
        totalCount: supportTickets[1]
      }
    } catch (err) {
      throw err;
    }
  }


  async uploadSupportFile(files, supportId) {
    try {
      // find service 
      let user = await this.supportRepository.findOne({
        where: {
          id: supportId
        }
      })
      const file = files.supportFile[0];
      let fileEntry = await this.fileService.save(file.buffer, diskNames.USER, file.originalname, 2, "0", file.mimetype)
      user.supportFile = fileEntry.id;
      await this.supportRepository.save(user);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateSupportDto: any) {
    try {
      await this.supportRepository.update({
        id: id
      }, {
        isOpen: updateSupportDto.isOpen,
        remarks: updateSupportDto.remarks
      })
      if (!updateSupportDto.isOpen) {
        // create notification
        let supportTicketDetails = await this.supportRepository.findOne({
          where: {
            id: id
          },
          relations: ['project', 'project.user']
        })
        if (supportTicketDetails.project && supportTicketDetails.project.id) {
          let bidDetails = await this.bidService.findOne({ where: { project: { id: supportTicketDetails.project.id }, isApproved: true }, relations: ['user', 'assignedToUser'] })
          if (updateSupportDto.projectStatus) {
            await this.projectService.updateProjectStatus(supportTicketDetails.project.id, { status: updateSupportDto.projectStatus }, { role: ROLE.ADMIN })
          }
          if (bidDetails.assignedToUser) {
            // to assigned team members
            await this.notificationsService.create({
              userId: bidDetails.assignedToUser.id,
              role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
              title: `Your ${id} tickets has been resolved`,
              description: `Your ${id} tickets has been resolved`,
              serviceId: null,
              projectId: supportTicketDetails.project.id + '',
              config: {
                isTeamMember: true,
                id: supportTicketDetails.project.id,
                status: supportTicketDetails.project.id,
                type: 'SUPPORT'
              }
            })
          }
          await this.notificationsService.create({
            userId: bidDetails.user.id,
            role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
            title: `Your ${id} tickets has been resolved`,
            description: `Your ${id} tickets has been resolved`,
            serviceId: null,
            projectId: supportTicketDetails.project.id + '',
            config: {
              isTeamMember: false,
              id: supportTicketDetails.project.id,
              status: supportTicketDetails.project.status,
              type: 'SUPPORT'
            }
          })
          // notification for client
          await this.notificationsService.create({
            userId: supportTicketDetails.project.user.id,
            role: ROLE.CLIENT,
            title: `Your ${id} tickets has been resolved`,
            description: `Your ${id} tickets has been resolved`,
            serviceId: null,
            projectId: supportTicketDetails.project.id + '',
            config: {
              id: supportTicketDetails.project.id,
              status: supportTicketDetails.project.status,
              type: 'SUPPORT'
            }
          })
        } else {
          await this.notificationsService.create({
            userId: supportTicketDetails.raisedBy.id,
            role: supportTicketDetails.raisedBy.role,
            title: `Your ${id} tickets has been resolved`,
            description: `Your ${id} tickets has been resolved`,
            serviceId: null,
            projectId: null,
            config: {
              id: supportTicketDetails.id,
              status: supportTicketDetails.isOpen,
              type: 'SUPPORT'
            }
          })
        }
      }
      if (updateSupportDto.hasOwnProperty("isOpen")) {
        const supportTicket = await this.supportRepository.findOne({
          where: {
            id: id
          }
        })
        if (supportTicket.chatId) {
          const db = getFirestore();
          await db.collection("chats").doc(supportTicket.chatId).update({
            active: updateSupportDto.isOpen
          })
        }
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateClientChatCount(id: number, chatCount: number, sendNotification: Boolean) {
    try {
      let support = await this.supportRepository.findOne({
        where: {
          id: id
        },
        relations: ['project', 'project.user']
      })
      await this.supportRepository.update({
        id: id
      }, {
        unreadChatCountClient: chatCount === 0 ? 0 : support.unreadChatCountClient + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: support.project.user.id,
          role: support.project.user.role === ROLE.CLIENT ? support.project.user.role : support.project.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: support.project.id,
          config: {
            isTeamMember: false,
            id: support.id,
            status: support.isOpen,
            type: 'SUPPORT'
          }
        })
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async updateProviderChatCount(id: number, chatCount: number, sendNotification: Boolean, userTokenData) {
    try {
      let support = await this.supportRepository.findOne({
        where: {
          id: id
        }
      })
      await this.supportRepository.update({
        id: id
      }, {
        unreadChatCountProvider: chatCount === 0 ? 0 : support.unreadChatCountProvider + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: userTokenData.appUserId,
          role: support.project.user.role !== ROLE.CLIENT ? support.project.user.role : support.project.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: support.project.id,
          config: {
            isTeamMember: false,
            id: support.id,
            status: support.isOpen,
            type: 'SUPPORT'
          }
        })
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }
}
