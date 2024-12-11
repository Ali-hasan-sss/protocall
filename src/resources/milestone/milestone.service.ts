import { forwardRef, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { diskNames } from 'src/global/disk-names';
import { COST_TYPE, MILESTONE_STATUS, PROJECT_STATUS, ROLE } from 'src/global/enums';
import { Repository } from 'typeorm';
import { BidService } from '../bid/bid.service';
import { FileService } from '../file/file.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentService } from '../payment/payment.service';
import { ProjectService } from '../project/project.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { Milestone } from './entities/milestone.entity';
import { UpdateBidDto } from '../bid/dto/update-bid.dto';
import { CommissionsService } from '../commissions/commissions.service';
import { PayoutsService } from '../payouts/payouts.service';
import { UserService } from '../user/user.service';

@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(Milestone) private milestoneRepository: Repository<Milestone>,
    @Inject(FileService) private fileService: FileService,
    @Inject(forwardRef(() => PaymentService)) private paymentService: PaymentService,
    @Inject(forwardRef(() => BidService)) private bidService: BidService,
    @Inject(forwardRef(() => ProjectService)) private projectService: ProjectService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
    @Inject(forwardRef(() => CommissionsService)) private readonly commissionsService: CommissionsService,
    @Inject(forwardRef(() => PayoutsService)) private readonly payoutsService: PayoutsService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
  ) { }

  async save(milestone: Milestone) {
    try {
      return await this.milestoneRepository.save(milestone);
    } catch (err) {
      throw err;
    }
  }

  async create(milestone: Milestone) {
    try {
      return await this.milestoneRepository.create(milestone);
    } catch (err) {
      throw err;
    }
  }


  async uploadFiles(id, files) {
    try {
      let milestoneDetails = await this.milestoneRepository.findOne({
        where: {
          id: id
        }
      })
      milestoneDetails.files = milestoneDetails.files.length ? milestoneDetails.files : [];
      for (let index = 0; index < files.milestone.length; index++) {
        const file = files.milestone[index];
        let fileDetail = await this.fileService.save(file.buffer, diskNames.MILESTONE, file.originalname, 2, "0", file.mimetype)
        milestoneDetails.files.push(fileDetail);
      }

      await this.milestoneRepository.save(milestoneDetails);
      return {
        success: true
      }

    } catch (err) {
      throw err;
    }
  }

  async deleteFile(milestoneId, fileId) {
    try {
      let milestoneDetails = await this.milestoneRepository.findOne({
        where: {
          id: milestoneId
        }
      })
      if (milestoneDetails.files && milestoneDetails.files.length) {
        if (milestoneDetails.files.find(file => file.id === fileId)) {
          let updatedFiles = milestoneDetails.files.filter(file => file.id !== fileId);
          let fileDeletion = await this.fileService.delete(fileId);
          if (fileDeletion.affected) {
            milestoneDetails.files = updatedFiles;
            await this.milestoneRepository.save(milestoneDetails);
            return {
              success: true
            }
          }
        }
      }
      throw new NotFoundException('File not found!')
    } catch (err) {
      throw err
    }
  }

  async updateMileStoneNotComplete(paymentIntentSecret) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          intentSecret: paymentIntentSecret
        }
      })
      if (milestone) {
        milestone.intentSecret = null;
        milestone.isCompleted = false;
        milestone.status = MILESTONE_STATUS.PAYMENT_PENDING
        return await this.milestoneRepository.save(milestone)
      }
    } catch (err) {
      throw err;
    }
  }

  async updateMileStoneToComplete(paymentIntentSecret) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          intentSecret: paymentIntentSecret
        },
        relations: ['project']
      })
      // create notifications
      // get user id
      let bidDetails = await this.bidService.findOne({
        where: {
          project: {
            id: milestone.project.id
          },
          isApproved: true
        },
        relations: ['user', 'assignedToUser', 'project']
      })
      if (bidDetails.assignedToUser) {
        // to assigned team members
        await this.notificationsService.create({
          userId: bidDetails.assignedToUser.id,
          role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
          title: `You have received milestone payment ${bidDetails.bidAmount} for the ${bidDetails.project.headline}.`,
          description: `You have received milestone payment ${bidDetails.bidAmount} for the ${bidDetails.project.headline}.`,
          serviceId: null,
          projectId: milestone.project.id,
          config: {
            isTeamMember: true,
            id: milestone.project.id,
            status: milestone.project.status,
            type: 'PROJECT'
          }
        })
      }
      await this.notificationsService.create({
        userId: bidDetails.user.id,
        role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
        title: `You have received milestone payment ${bidDetails.bidAmount} for the ${bidDetails.project.headline}.`,
        description: `You have received milestone payment ${bidDetails.bidAmount} for the ${bidDetails.project.headline}.`,
        serviceId: null,
        projectId: milestone.project.id,
        config: {
          isTeamMember: false,
          id: milestone.project.id,
          status: milestone.project.status,
          type: 'PROJECT'
        }
      })
      milestone.isCompleted = true;
      milestone.status = MILESTONE_STATUS.PAYMENT_DONE;
      await this.milestoneRepository.save(milestone);

      let project = await this.projectService.findByProjectId(milestone.project.id);
      if (project) {
        let projectMilestonesLength = project.milestones.length || 0;
        let completedMilestones = project.milestones.filter(mil => mil.isCompleted);
        if (projectMilestonesLength === completedMilestones.length) {
          return await this.projectService.updateProjectStatus(
            project.id,
            { status: PROJECT_STATUS.COMPLETED },
            null
          )
        }
        return {
          success: true
        }
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async completeMileStone(id: number) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          id: id
        },
        relations: ['project']
      })
      let project = await this.projectService.findByProjectId(milestone.project.id);
      let amount = 0;
      let approvedBid = project.bids.find(bid => bid.isApproved);
      // calculate if cost if project is hourly
      if (approvedBid) {
        if (project.costType === COST_TYPE.HOURLY) {
          if (project.milestones.length) {
            let milestone = project.milestones.find((milestone) => milestone.id === id);
            let totalNumberOfHours = 0;
            if (milestone.timeSheet) {
              let timeSheet = JSON.parse(milestone.timeSheet)
              if (timeSheet && timeSheet.length) {
                timeSheet.forEach(slot => {
                  totalNumberOfHours += slot.hoursCompleted
                })
              }
            }
            amount = totalNumberOfHours * approvedBid.bidAmount
          }
        } else {
          amount = approvedBid.bidAmount * milestone.paymentToBeReleased / 100; // payment to be released
        }
      }
      let paymentIntent = await this.paymentService.createPaymentIntent(amount, 'Project Payment', {
        isService: false
      });

      milestone.intentSecret = paymentIntent.client_secret;
      await this.milestoneRepository.save(milestone);
      return {
        clientSecret: paymentIntent.client_secret,
        amount
      };
    } catch (err) {
      throw err;
    }
  }

  async markMilestonePaymentInProgress(id: number) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          id: id
        },
        relations: ['project']
      })
      if (!milestone) {
        throw new NotFoundException("Milestone not found!")
      }
      if (milestone.status === MILESTONE_STATUS.PAYMENT_PENDING) {
        milestone.status = MILESTONE_STATUS.PAYMENT_IN_PROGRESS;
        await this.milestoneRepository.save(milestone);
        return {
          success: true,
          status: "changed"
        }
      }
      return {
        success: true,
        status: "not changed"
      }
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateMilestoneDto: UpdateMilestoneDto, userTokenData: any) {
    try {
      let {
        timeSheet,
        deliverables,
        ...updateObj
      } = updateMilestoneDto;
      let milestoneObj = await this.milestoneRepository.findOne({
        where: {
          id: id
        }
      })
      await this.milestoneRepository.save({ ...milestoneObj, ...updateObj, timeSheet: JSON.stringify(updateMilestoneDto.timeSheet), deliverables: JSON.stringify(updateMilestoneDto.deliverables) });
      // get milestone details
      let milestoneDetails = await this.milestoneRepository.findOne({
        where: {
          id: id
        },
        relations: ['project', 'project.user']
      })
      // get user id
      let bidDetails = await this.bidService.findOne({
        where: {
          project: {
            id: milestoneDetails.project.id
          },
          isApproved: true
        },
        relations: ['user', 'assignedToUser']
      })

      if (updateMilestoneDto.paymentRequestMade) {
        if (userTokenData.role !== ROLE.CLIENT) {
          // notification to client
          await this.notificationsService.create({
            userId: milestoneDetails.project.user.id,
            role: ROLE.CLIENT,
            title: 'Payment Request',
            description: 'The Service Provider has made a payment release request for a milestone.',
            serviceId: null,
            projectId: milestoneDetails.project.id + '',
            config: {
              isTeamMember: false,
              id: milestoneDetails.project.id,
              status: milestoneDetails.project.status,
              type: 'PROJECT'
            }
          })
        }
      }
      // create notification
      if (userTokenData.role === ROLE.CLIENT) {
        if (bidDetails.assignedToUser) {
          // to assigned team members
          await this.notificationsService.create({
            userId: bidDetails.assignedToUser.id,
            role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
            title: 'Milestone Updated',
            description: 'A milestone for your project has been updated by the client',
            serviceId: null,
            projectId: milestoneDetails.project.id,
            config: {
              isTeamMember: true,
              id: milestoneDetails.project.id,
              status: milestoneDetails.project.status,
              type: 'PROJECT'
            }
          })
        }
        await this.notificationsService.create({
          userId: bidDetails.user.id,
          role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
          title: 'Milestone Updated',
          description: 'A milestone for your project has been updated by the client',
          serviceId: null,
          projectId: milestoneDetails.project.id,
          config: {
            isTeamMember: false,
            id: milestoneDetails.project.id,
            status: milestoneDetails.project.status,
            type: 'PROJECT'
          }
        })
      }
      if (userTokenData.role !== ROLE.CLIENT) {
        // notification to client
        await this.notificationsService.create({
          userId: milestoneDetails.project.user.id,
          role: ROLE.CLIENT,
          title: 'Milestone Updated',
          description: 'A milestone for your project has been updated by the service provider',
          serviceId: null,
          projectId: milestoneDetails.project.id + '',
          config: {
            isTeamMember: true,
            id: milestoneDetails.project.id,
            status: milestoneDetails.project.status,
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

  async findById(id: number) {
    try {
      let milestoneObj = await this.milestoneRepository.findOne({
        where: {
          id: id
        }
      })
      let isProjectCompleted = false;
      if (milestoneObj && milestoneObj.project.id) {
        let project = await this.projectService.findOne({
          where: {
            id: milestoneObj.project.id
          },
          relations: ["milestones"]
        })
        if (project && project.milestones && project.milestones.length) {
          const completedMilestones = project.milestones.filter(milestone => milestone.isCompleted);
          if (completedMilestones && completedMilestones.length) {
            isProjectCompleted = completedMilestones.length === project.milestones.length;
          }
        }
      }
      if (milestoneObj) {
        return {
          success: true,
          isProjectCompleted,
          data: milestoneObj || {}
        }
      } else {
        throw new NotFoundException("Milestone not found!")
      }
    } catch (err) {
      throw err;
    }
  }

  /* -------------------- Payment Flow Changes ----------------------- */
  async mileStonePaymentSucceedAndApproveBidder(paymentIntentSecret: string, bidderId: number) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          intentSecret: paymentIntentSecret
        },
        relations: ['project']
      })

      // Update Milestone flags
      milestone.paymentRequestMade = true;
      milestone.status = MILESTONE_STATUS.PAYMENT_DONE;
      await this.save(milestone);

      if (bidderId) {   /* If First Milestone */
        await this.bidService.update(bidderId, { isApproved: true } as UpdateBidDto);
        await this.projectService.updateProjectStatus(milestone?.project?.id, { status: PROJECT_STATUS.IN_PROGRESS }, {});
      }

      /* --------------------- Create Payout for milestone --------------------- */
      let bidDetails = await this.bidService.findOne({ where: { project: { id: milestone.project?.id }, isApproved: true }, relations: ['user', 'assignedToUser', 'project.bids', 'project.milestones'] })

      if (bidDetails?.assignedToUser) {
        // to assigned team members
        await this.notificationsService.create({
          userId: bidDetails.assignedToUser.id,
          role: bidDetails.assignedToUser.role === ROLE.CLIENT ? bidDetails.assignedToUser.secondaryRole : bidDetails.assignedToUser.role,
          title: 'Payment for Milestone funded.',
          description: 'The payment for your milestone for a project funded.',
          serviceId: null,
          projectId: bidDetails?.project?.id + '',
          config: {
            isTeamMember: true,
            id: bidDetails?.project?.id,
            status: bidDetails?.project?.status,
            type: 'PROJECT'
          }
        })
      }

      await this.notificationsService.create({
        userId: bidDetails.user.id,
        role: bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role,
        title: 'Payment for Milestone received',
        description: 'The payment for your milestone for a project completed',
        serviceId: null,
        projectId: bidDetails?.project?.id + '',
        config: {
          isTeamMember: false,
          id: bidDetails?.project?.id,
          status: bidDetails?.project?.status,
          type: 'PROJECT'
        }
      })

      let userRole = bidDetails.user.role === ROLE.CLIENT ? bidDetails.user.secondaryRole : bidDetails.user.role;
      let commission = await this.commissionsService.calculateCommission(bidDetails.user.id, userRole);

      const calculatedMilestoneCost = this.projectService.calculateMilestoneTotalCost(bidDetails.project, milestone?.id);
      let totalAmountEarned = calculatedMilestoneCost;

      if (commission) {
        totalAmountEarned = totalAmountEarned - (commission.percentage / 100 * calculatedMilestoneCost);
      }

      if (bidDetails.taxPercentage) {
        totalAmountEarned = totalAmountEarned - ((parseInt(bidDetails.taxPercentage) / 100) * calculatedMilestoneCost);
      }

      // add to payout
      await this.payoutsService.create({
        madeByClient: calculatedMilestoneCost,
        commission: commission ? commission.percentage / 100 * calculatedMilestoneCost : 0,
        payableToSP: totalAmountEarned,
        taxAmount: bidDetails.taxPercentage ? (parseInt(bidDetails.taxPercentage) / 100) * calculatedMilestoneCost : 0,
        netEarning: commission ? commission.percentage / 100 * calculatedMilestoneCost : 0,
        serviceId: null,
        projectId: milestone.project.id,
        milestoneId: milestone.id,
        clientUserId: milestone.project.user.id,
        serviceProviderUserId: bidDetails?.assignedToUser?.id || bidDetails?.user?.id
      })

      // create a notification for admin
      let adminId = await this.userService.findOne({
        where: {
          role: ROLE.ADMIN
        }
      })
      if (adminId) {
        await this.notificationsService.create({
          userId: adminId.id,
          role: ROLE.ADMIN,
          title: 'Payout raised',
          description: 'A New payout request has been received',
          serviceId: null,
          projectId: milestone.project.id + '',
          config: {
            type: 'PROJECT'
          }
        })
      }

      // add to user total earned and client's total spent
      let serviceProvider = await this.userService.findOne({
        where: {
          id: bidDetails.user.id
        }
      });
      serviceProvider.totalEarned = serviceProvider.totalEarned + totalAmountEarned;
      let totalHours = 0;
      serviceProvider.totalHours = serviceProvider.totalHours + totalHours;
      await this.userService.save(serviceProvider);

      let client = await this.userService.findOne({
        where: {
          id: milestone?.project?.user?.id
        }
      })
      client.totalSpent = client.totalSpent + calculatedMilestoneCost;
      await this.userService.save(client);

      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async approveMilestonePaymentRelease(milestoneId: number) {
    try {
      let milestone = await this.milestoneRepository.findOne({
        where: {
          id: milestoneId
        },
      })

      if (!milestone) {
        return { success: false, error: "Milestone not found" }
      }

      await this.payoutsService.approveReleasePayout(milestone?.id);

      milestone.status = MILESTONE_STATUS.PAYMENT_RELEASE_APPROVE;
      await this.save(milestone);
      return { success: true, error: "", message: "Payment release request successfully approved." }
    } catch (err) {
      throw err;
    }
  }
}
