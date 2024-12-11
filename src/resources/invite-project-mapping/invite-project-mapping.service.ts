import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ROLE } from 'src/global/enums';
import { ProjectService } from 'src/resources/project/project.service';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from '../user/user.service';
import { CreateInviteProjectMappingDto } from './dto/create-invite-project-mapping.dto';
import { UpdateInviteProjectMappingDto } from './dto/update-invite-project-mapping.dto';
import { InviteProjectMapping } from './entities/invite-project-mapping.entity';
import * as  moment from 'moment';

@Injectable()
export class InviteProjectMappingService {
  constructor(
    @InjectRepository(InviteProjectMapping) private readonly inviteProjectMappingRepository: Repository<InviteProjectMapping>,
    @Inject(ProjectService) private projectService: ProjectService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService
  ) { }

  async create(createInviteProjectMappingDto: CreateInviteProjectMappingDto) {
    for (let index = 0; index < createInviteProjectMappingDto.userIds.length; index++) {
      const userId = createInviteProjectMappingDto.userIds[index];
      const user = await this.userService.findOne({
        where: {
          id: userId as number
        }
      })
      let createInstance = await this.inviteProjectMappingRepository.create({
        user: {
          id: userId
        },
        project: {
          id: createInviteProjectMappingDto.projectId
        }
      })
      let project = await this.projectService.findOne({ where: { id: createInviteProjectMappingDto.projectId as number }, relations: ['user'] })
      await this.inviteProjectMappingRepository.save(createInstance)
      // create notification 
      await this.notificationsService.create({
        userId: userId as number,
        role: user.role === ROLE.CLIENT ? user.secondaryRole : user.role,
        title: `${project.user.firstName} ${project.user.lastName} has sent you an invitation for the new project.`,
        description: `${project.user.firstName} ${project.user.lastName} has sent you an invitation for the new project.`,
        serviceId: null,
        projectId: createInviteProjectMappingDto.projectId + '',
        config: {
          isTeamMember: true,
          id: createInviteProjectMappingDto.projectId,
          status: project.status,
          type: 'PROJECT'
        }
      })
    }
    return {
      success: true
    }
  }

  // **** add expiry condition
  async findInvitesByUserId(limit, offset, userTokenData) {
    try {
      let invites = await this.inviteProjectMappingRepository.createQueryBuilder('inviteProject')
        .innerJoinAndSelect('inviteProject.user', 'user', 'inviteProject.fk_id_user=:userId', {
          userId: userTokenData.appUserId
        })
        .leftJoinAndSelect('inviteProject.project', 'project')
        .leftJoinAndSelect('project.bids', 'bids')
        .where({
          project: {
            biddingEndDate: MoreThan(moment().toDate())
          }
        })
        .andWhere('inviteProject.fk_id_user NOT IN (Select fk_id_user from bid where fk_id_project = project.id)')
        .limit(limit)
        .offset(offset)
        .getManyAndCount()

      invites[0].forEach(invite => {
        invite.project = this.projectService.calculateProjectExtraFields(invite.project)
      })
      return {
        invites: invites[0],
        totalCount: invites[1],
        totalPageCount: invites[1] ? Math.ceil(invites[1] / (limit || 6)) : 0
      };
    } catch (err) {
      throw err;
    }
  }

  async updateClientChatCount(id: number, chatCount: number, sendNotification) {
    try {
      let a = await this.inviteProjectMappingRepository.findOne({
        where: {
          id: id
        },
        relations: ['project', 'project.user']
      })

      await this.inviteProjectMappingRepository.update({
        id: id
      }, {
        unreadChatCountClient: chatCount === 0 ? 0 : a.unreadChatCountClient + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: a.project.user.id,
          role: a.project.user.role === ROLE.CLIENT ? a.project.user.role : a.project.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: a.project.id,
          config: {
            isTeamMember: false,
            id: a.project.id || null,
            status: a.project.status || null,
            type: 'PROJECT'
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

  async count(options) {
    return await this.inviteProjectMappingRepository.count(options)
  }

  async updateProviderChatCount(id: number, chatCount: number, sendNotification) {
    try {
      let a = await this.inviteProjectMappingRepository.findOne({
        where: {
          id: id
        },
        relations: ['user', 'project']
      })
      await this.inviteProjectMappingRepository.update({
        id: id
      }, {
        unreadChatCountProvider: chatCount === 0 ? 0 : a.unreadChatCountProvider + chatCount
      })
      if (sendNotification) {
        // create shortlisted notification
        await this.notificationsService.create({
          userId: a.user.id,
          role: a.user.role !== ROLE.CLIENT ? a.user.role : a.user.secondaryRole,
          title: 'New message',
          description: 'A new message has been received.',
          serviceId: null,
          projectId: a.project.id,
          config: {
            isTeamMember: false,
            id: a.project.id || null,
            status: a.project.status || null,
            type: 'PROJECT'
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

  findAll() {
    return `This action returns all inviteProjectMapping`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inviteProjectMapping`;
  }

  update(id: number, updateInviteProjectMappingDto: UpdateInviteProjectMappingDto) {
    return `This action updates a #${id} inviteProjectMapping`;
  }

  remove(id: number) {
    return `This action removes a #${id} inviteProjectMapping`;
  }
}
