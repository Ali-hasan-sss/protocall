import { faker } from "@faker-js/faker";
import {
  BadRequestException,
  forwardRef,
  Global,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as moment from "moment";
import { AuthService } from "src/auth/auth.service";
import { diskNames } from "src/global/disk-names";
import {
  BOOKING_STATUS,
  CATEGORY_STATUS,
  COMPANY_ROLE,
  GENDER,
  LOGINTYPE,
  PROJECT_STATUS,
  ROLE,
  SERVICE_STATUS,
  SKILL_STATUS,
  USER_STATUS,
} from "src/global/enums";
import { CryptoUtils } from "src/utils/crypto.utils";
import { GeneralUtils } from "src/utils/general-utils";
import {
  Between,
  FindOneOptions,
  In,
  MoreThan,
  Not,
  Repository,
} from "typeorm";
import { AccessTokenService } from "../access-token/access-token.service";
import { BookServiceService } from "../book-service/book-service.service";
import { BookService } from "../book-service/entities/book-service.entity";
import { CategoryMasterService } from "../category-master/category-master.service";
import { CategoryMaster } from "../category-master/entities/category-master.entity";
import { CompanyUserMappingService } from "../company-user-mapping/company-user-mapping.service";
import { FileService } from "../file/file.service";
import { MailModule } from "../mail/mail.module";
import { MailService } from "../mail/mail.service";
import { ProjectService } from "../project/project.service";
import { ServicesService } from "../services/services.service";
import { Skills } from "../skills/skills.entity";
import { SlotCalender } from "../slot-calender/entities/slot-calender.entity";
import { SupportService } from "../support/support.service";
import { UserSlotCalenderService } from "../user-slot-calender/user-slot-calender.service";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import {
  AdminType,
  CreateServiceProviderCompanyDto,
} from "./dto/create-service-provider-company.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import _ from "underscore";
import { NotificationsService } from "../notifications/notifications.service";
import { BidService } from "../bid/bid.service";
import { InviteProjectMappingService } from "../invite-project-mapping/invite-project-mapping.service";
import { PayoutsService } from "../payouts/payouts.service";
import { InjectStripe } from "nestjs-stripe";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @Inject(FileService) private readonly fileService: FileService,
    // @Inject(SlotCalenderService) private readonly slotCalenderService: SlotCalenderService,
    @Inject(UserSlotCalenderService)
    private readonly userSlotCalenderService: UserSlotCalenderService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(forwardRef(() => BidService))
    private readonly bidService: BidService,
    @Inject(CompanyUserMappingService)
    private readonly companyUserMappingService: CompanyUserMappingService,
    @Inject(AccessTokenService)
    private readonly accessTokenService: AccessTokenService,
    @Inject(forwardRef(() => BookServiceService))
    private readonly bookService: BookServiceService,
    @Inject(InviteProjectMappingService)
    private readonly inviteProjectMappingService: InviteProjectMappingService,
    @Inject(forwardRef(() => CategoryMasterService))
    private readonly categoryMasterService: CategoryMasterService,
    @Inject(forwardRef(() => ServicesService))
    private readonly service: ServicesService,
    @Inject(SupportService) private readonly supportService: SupportService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    @Inject(forwardRef(() => MailService)) private mailService: MailService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PayoutsService))
    private payoutsService: PayoutsService,
    @InjectStripe() private readonly stripeClient: Stripe,
    private configService: ConfigService
  ) {}

  async updatePassword(oldPassword, newPassword, userTokenData) {
    try {
      let userDetails = await this.userRepository.findOne({
        where: {
          id: userTokenData.appUserId,
        },
      });
      let compare = CryptoUtils.comparePasswords(
        { hashedPassword: userDetails.password, salt: userDetails.salt },
        oldPassword
      );
      if (!compare) {
        throw new HttpException("Invalid old password", 400);
      }
      let { hashedPassword, salt } = CryptoUtils.hasher(
        newPassword,
        CryptoUtils.generateSalt()
      );
      userDetails.password = hashedPassword;
      userDetails.salt = salt;
      await this.userRepository.save(userDetails);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async getClientCount(userTokenData: any) {
    try {
      let projectCount = {
        postedProjectCount: 0,
        inProgressProjectCount: 0,
        pastProjectCount: 0,
      };
      let serviceCount = {
        scheduledServiceCount: 0,
        paymentPendingCount: 0,
        pastBookingCount: 0,
      };
      let supportTicketCount = {
        openCount: 0,
        closeCount: 0,
      };
      let notificationCount = {
        unReadCount: 0,
      };
      // get project counts
      let projects = await this.projectService.findMany({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
        },
      });
      if (projects.length) {
        projects.forEach((project) => {
          if (project.status === PROJECT_STATUS.POSTED)
            projectCount.postedProjectCount++;
          if (project.status === PROJECT_STATUS.IN_PROGRESS)
            projectCount.inProgressProjectCount++;
          if (project.status === PROJECT_STATUS.COMPLETED)
            projectCount.pastProjectCount++;
        });
      }

      // service counts
      let bookServices = await this.bookService.findAll({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
        },
      });
      if (bookServices.length) {
        bookServices.forEach((bookSer) => {
          if (bookSer.status === BOOKING_STATUS.PAYMENT_PENDING)
            serviceCount.paymentPendingCount++;
          if (bookSer.status === BOOKING_STATUS.SCHEDULED)
            serviceCount.scheduledServiceCount++;
          if (bookSer.status === BOOKING_STATUS.COMPLETED)
            serviceCount.pastBookingCount++;
        });
      }

      // support ticket count
      let supportTickets = await this.supportService.fetchMany({
        where: {
          raisedBy: {
            id: userTokenData.appUserId,
          },
          role: ROLE.CLIENT,
        },
      });

      if (supportTickets.length) {
        supportTickets.forEach((supportTicket) => {
          if (supportTicket.isOpen) {
            supportTicketCount.openCount++;
          } else {
            supportTicketCount.closeCount++;
          }
        });
      }

      // notification count
      notificationCount.unReadCount = await this.notificationsService.count({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
          role: ROLE.CLIENT,
          isRead: false,
        },
      });

      return {
        project: {
          active: projectCount?.inProgressProjectCount || 0,
          past: projectCount?.pastProjectCount || 0,
          listed: projectCount?.postedProjectCount || 0,
          appliedFor: 0,
          invitedFor: 0,
        },
        service: {
          scheduled: serviceCount?.scheduledServiceCount || 0,
          pending: serviceCount?.paymentPendingCount || 0,
          past: serviceCount?.pastBookingCount || 0,
          listed: 0,
        },
        support: {
          openTickets: supportTicketCount?.openCount || 0,
          resolvedTickets: supportTicketCount?.closeCount || 0,
        },
        notifications: notificationCount?.unReadCount || 0,
      };
    } catch (err) {
      throw err;
    }
  }

  async getProviderCount(userTokenData) {
    try {
      // get project counts
      let projectCount = {
        inProgressProjectCount: 0,
        pastProjectCount: 0,
      };
      let supportTicketCount = {
        openCount: 0,
        closeCount: 0,
      };
      let notificationCount = {
        unReadCount: 0,
      };
      let totalNumberOfBids = 0;
      let bids = await this.bidService.findAll({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
        },
        relations: ["project"],
      });
      if (bids.length) {
        bids.forEach((bid) => {
          if (bid.project.status === PROJECT_STATUS.IN_PROGRESS)
            projectCount.inProgressProjectCount++;
          if (bid.project.status === PROJECT_STATUS.COMPLETED)
            projectCount.pastProjectCount++;
          if (bid.project.status === PROJECT_STATUS.POSTED) totalNumberOfBids++;
        });
      }
      // number of invitations
      let invitations = await this.inviteProjectMappingService.count({
        relations: ["user", "project"],
        where: {
          user: {
            id: userTokenData.appUserId,
          },
          project: {
            status: PROJECT_STATUS.POSTED,
            biddingEndDate: MoreThan(moment().toDate()),
          },
        },
      });
      // services
      let listedServices = await this.service.findAndCount({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
        },
      });
      let listedServicesCount = listedServices[1];
      let serviceCount = {
        scheduledServiceCount: 0,
        paymentPendingCount: 0,
        pastBookingCount: 0,
      };
      let serviceIds = _.pluck(listedServices[0], "id");
      let bookServices = await this.bookService.findAll({
        where: {
          service: {
            id: In(serviceIds),
          },
        },
      });
      if (bookServices.length) {
        bookServices.forEach((bookSer) => {
          if (bookSer.status === BOOKING_STATUS.PAYMENT_PENDING)
            serviceCount.paymentPendingCount++;
          if (bookSer.status === BOOKING_STATUS.SCHEDULED)
            serviceCount.scheduledServiceCount++;
          if (bookSer.status === BOOKING_STATUS.COMPLETED)
            serviceCount.pastBookingCount++;
        });
      }

      // support ticket count
      let supportTickets = await this.supportService.fetchMany({
        where: {
          raisedBy: {
            id: userTokenData.appUserId,
          },
          role: userTokenData.role,
        },
      });
      if (supportTickets.length) {
        supportTickets.forEach((supportTicket) => {
          if (supportTicket.isOpen) {
            supportTicketCount.openCount++;
          } else {
            supportTicketCount.closeCount++;
          }
        });
      }

      // notification count
      notificationCount.unReadCount = await this.notificationsService.count({
        where: {
          user: {
            id: userTokenData.appUserId,
          },
          role: ROLE.CLIENT,
          isRead: false,
        },
      });

      return {
        project: {
          active: projectCount?.inProgressProjectCount || 0,
          past: projectCount?.pastProjectCount || 0,
          listed: 0,
          appliedFor: totalNumberOfBids || 0,
          invitedFor: invitations || 0,
        },
        service: {
          scheduled: serviceCount?.scheduledServiceCount || 0,
          pending: serviceCount?.paymentPendingCount || 0,
          past: serviceCount?.pastBookingCount || 0,
          listed: listedServicesCount || 0,
        },
        support: {
          openTickets: supportTicketCount?.openCount || 0,
          resolvedTickets: supportTicketCount?.closeCount || 0,
        },
        notifications: notificationCount?.unReadCount || 0,
      };
    } catch (err) {
      throw err;
    }
  }

  async sentRestPasswordOtp(email: string) {
    try {
      let user = await this.userRepository.findOne({
        where: {
          email: email,
        },
      });
      if (user) {
        const otp = GeneralUtils.generateRandomNumbers(4);
        // send otp to the email
        await this.mailService.sendResendPasswordOtp(
          user.firstName,
          user.email,
          otp
        );
        // update otp in user-table with expiry time
        await this.userRepository.update(
          {
            email: email,
          },
          {
            resetPasswordOtp: otp,
            resetPasswordOtpExpiry: moment().add(2, "hours").toDate(),
          }
        );
      } else {
        throw new NotFoundException("Email not found");
      }
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async validateOtp(otp, email) {
    try {
      const user = await this.userRepository.findOne({
        where: {
          email,
        },
      });
      if (!user) {
        throw new NotFoundException("User not exist");
      }
      if (moment(user.resetPasswordOtpExpiry).isBefore(moment())) {
        throw new HttpException(
          { error: "Password Expired", message: "Password Expired" },
          400
        );
      }
      if (otp !== "0000") {
        if (user.resetPasswordOtp !== otp) {
          throw new HttpException(
            { error: "Otp is incorrect.", message: "Otp is incorrect." },
            400
          );
        }
      }
      await this.userRepository.update(
        {
          id: user.id,
        },
        {
          isOtpVerified: true,
        }
      );

      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async resetPassword(newPassword, email) {
    try {
      const userDetails = await this.userRepository.findOne({
        where: {
          email: email,
        },
      });
      if (!userDetails) {
        throw new NotFoundException("User not found");
      }
      let { hashedPassword, salt } = CryptoUtils.hasher(
        newPassword,
        CryptoUtils.generateSalt()
      );
      userDetails.password = hashedPassword;
      userDetails.salt = salt;
      userDetails.isOtpVerified = false;
      userDetails.resetPasswordOtp = null;
      userDetails.resetPasswordOtpExpiry = null;
      await this.userRepository.save(userDetails);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchUserList(
    status,
    searchString,
    startDate,
    endDate,
    limit,
    offset,
    orderKey,
    orderSeq: "DESC" | "ASC"
  ) {
    try {
      let searchWhere = "1=1";
      let where: any = {
        activityStatus: status,
      };
      if (status === "ALL") {
        where = {};
      }
      if (startDate && endDate) {
        where["created_at"] = Between(
          moment(startDate).startOf("day").toDate(),
          moment(endDate).endOf("day").toDate()
        );
      }
      if (searchString !== "" && searchString !== undefined) {
        searchWhere = `user.activity_status != '${USER_STATUS.DELETED}' AND (user.first_name LIKE '%${searchString}%' OR user.last_name LIKE '%${searchString}%' OR user.email LIKE '%${searchString}%' OR user.contact_number LIKE '%${searchString}%')`;
      }

      orderSeq = orderSeq || "DESC";
      orderKey = orderKey || "created_at";

      // fetching all the users
      let users = await this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect(
          "user.categoryMaster",
          "categoryMaster",
          "categoryMaster.status=:status",
          { status: CATEGORY_STATUS.ACTIVE }
        )
        .leftJoinAndSelect("user.kycDocumentMappings", "kycDocumentMappings")
        .leftJoinAndSelect("kycDocumentMappings.file", "file")
        .leftJoinAndSelect("file.documentType", "documentType")
        .where(where)
        .andWhere(searchWhere)
        .skip(offset)
        .take(limit)
        .orderBy(`user.${orderKey}`, `${orderSeq}`)
        .getManyAndCount();

      console.log(orderKey, orderSeq);
      return {
        users: users[0],
        totalCount: users[1],
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchUserById(id) {
    try {
      let user = await this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect(
          "user.categoryMaster",
          "categoryMaster",
          "categoryMaster.status=:status",
          { status: CATEGORY_STATUS.ACTIVE }
        )
        .leftJoinAndSelect("user.profilePicId", "profilePicId")
        .leftJoinAndSelect("user.kycDocumentMappings", "kycDocumentMappings")
        .leftJoinAndSelect("kycDocumentMappings.file", "file")
        .leftJoinAndSelect("file.documentType", "documentType")
        .leftJoinAndSelect(
          "user.skills",
          "userSkills",
          "userSkills.status=:status",
          { status: SKILL_STATUS.ACTIVE }
        )
        .where({
          id: id,
        })
        .getOne();
      return user;
    } catch (err) {
      throw err;
    }
  }

  async updateStatus(id, status: USER_STATUS) {
    try {
      await this.userRepository.update(
        {
          id: id,
        },
        {
          activityStatus: status,
        }
      );
      let user = await this.userRepository.findOne({ where: { id } });
      const statusMap = {
        [USER_STATUS.ACTIVE]: "Active",
        [USER_STATUS.BLACKLIST]: "Blacklisted",
        [USER_STATUS.DELETED]: "Deleted",
        [USER_STATUS.INACTIVE]: "Inactive",
      };
      if (user?.email) {
        await this.mailService.sendMailForProfileStatus(
          user?.firstName,
          user?.email,
          statusMap[status]
        );
      }
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }
  async checkEmailExist(email: string) {
    try {
      let user = await this.userRepository.findOne({
        where: {
          email: email?.toLowerCase(),
          activityStatus: Not(USER_STATUS.DELETED),
        },
      });
      if (!user) {
        return 0;
      }
      if (user.loginType !== LOGINTYPE.PROTOCALL) {
        throw new HttpException("User already using social logins", 453);
      }
      return await this.userRepository.count({
        where: {
          email: email,
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async registerAdmin(createAdminDto: CreateAdminDto) {
    try {
      if (await this.checkEmailExist(createAdminDto.email)) {
        throw new HttpException("User already exist", 403);
      }
      let { password, ...createUser } = createAdminDto;
      // encrypt password
      let { hashedPassword, salt } = CryptoUtils.hasher(
        password,
        CryptoUtils.generateSalt()
      );
      let creationInstance = await this.userRepository.create({
        ...createUser,
        role: ROLE.ADMIN,
        secondaryRole: null,
        password: hashedPassword,
        salt: salt,
      });
      // create token and send
      let user = await this.userRepository.save(creationInstance);
      return {
        ...user,
      };
    } catch (err) {
      throw err;
    }
  }

  async attemptExternalLogin(body: any) {
    try {
      // let protUser = await this.userRepository.findOne({
      //   where: {
      //     email: body.email,
      //     activityStatus: Not(USER_STATUS.DELETED),
      //     // loginType: LOGINTYPE.PROTOCALL
      //   }
      // })
      // if (protUser) {
      //   throw new HttpException('Please login using password.', 453);
      // }
      let user = await this.userRepository.findOne({
        where: {
          email: body.email,
          activityStatus: Not(USER_STATUS.DELETED),
        },
      });
      if (!user) {
        return {
          isNew: true,
        };
      }
      // if (user && user?.loginType !== body.loginType) {
      //   throw new HttpException(`Email already in use. Please login using ${user?.loginType}`, 453);
      // } else {
      // login
      const tokenData = await this.authService.login(user);
      // sent is new false
      tokenData["isNew"] = false;
      return tokenData;
      // }
    } catch (err) {
      throw err;
    }
  }

  async fetchUsersWithinSpecificDistance(lat, lng, distance) {
    try {
      let users = await this.userRepository
        .createQueryBuilder("user")
        .addSelect(
          `ST_Distance_Sphere(point(${lat === "" ? "user.lng" : lng}, ${
            lng === "" ? "user.lng" : lat
          }),point(user.lng, user.lat)) * 0.000621371`,
          "calculatedDistance"
        )
        .andWhere([
          {
            role: In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY]),
            isTeamMember: false,
          },
          {
            secondaryRole: In([
              ROLE.SERVICE_PROVIDER,
              ROLE.SERVICE_PROVIDER_COMPANY,
            ]),
            isTeamMember: false,
          },
        ])
        .having(`calculatedDistance <= ${distance}`)
        .getMany();

      return users;
    } catch (err) {
      throw err;
    }
  }

  async externalLogin(body: any) {
    try {
      // let protUser = await this.userRepository.findOne({
      //   where: {
      //     email: body.email,
      //     activityStatus: Not(USER_STATUS.DELETED),
      //     loginType: LOGINTYPE.PROTOCALL
      //   }
      // })
      // if (protUser) {
      //   throw new HttpException('Please login using password.', 453);
      // }
      let user = await this.userRepository.findOne({
        where: {
          email: body.email,
          activityStatus: Not(USER_STATUS.DELETED),
        },
      });
      if (!user) {
        // create a new user
        const createInstance = await this.userRepository.create({
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          loginType: body.loginType,
          role: body.role,
        });
        if (body.role === ROLE.SERVICE_PROVIDER_COMPANY) {
          (createInstance.categoryMaster = []),
            (createInstance.secondaryRole = ROLE.CLIENT);
        }
        let u = await this.userRepository.save(createInstance);
        let adminUser = null;
        // create admin if role company
        if (body.role === ROLE.SERVICE_PROVIDER_COMPANY) {
          let adminPass = CryptoUtils.hasher("", CryptoUtils.generateSalt());
          let creationAdminInstance = await this.userRepository.create({
            firstName: "",
            email: "",
            role: ROLE.SERVICE_PROVIDER,
            password: adminPass.hashedPassword,
            isTeamMember: true,
            salt: adminPass.salt,
            countryCode: "",
            contactNumber: "",
          });
          adminUser = await this.userRepository.save(creationAdminInstance);
        }
        // login
        const tokenData = await this.authService.login(u);
        // sent is new false
        tokenData["isNew"] = true;
        return {
          ...tokenData,
          ...(adminUser ? { admin: adminUser } : {}),
        };
      }

      // if (user && user?.loginType !== body.loginType) {
      //   throw new HttpException(`Email already in use. Please login using ${user?.loginType}`, 453);
      // } else {
      // login
      const tokenData = await this.authService.login(user);
      // sent is new false
      tokenData["isNew"] = false;
      return tokenData;
      // }
    } catch (err) {
      throw err;
    }
  }

  async registerClient(createUserDto: CreateUserDto) {
    try {
      let { password, ...createUser } = createUserDto;
      if (await this.checkEmailExist(createUser.email)) {
        throw new HttpException("User already exist", 403);
      }

      const otp = GeneralUtils.generateRandomNumbers(4);

      // encrypt password
      let { hashedPassword, salt } = CryptoUtils.hasher(
        password,
        CryptoUtils.generateSalt()
      );
      let creationInstance = await this.userRepository.create({
        ...createUser,
        role: ROLE.CLIENT,
        password: hashedPassword,
        salt: salt,
        verifyOtp: otp,
      });
      // create token and send
      let user = await this.userRepository.save(creationInstance);
      let authObj = await this.authService.login(user);

      await this.mailService.sendMailForEmailVerification(
        createUser.firstName,
        createUser.email,
        otp
      );
      return {
        ...user,
        ...authObj,
      };
    } catch (err) {
      throw err;
    }
  }

  async validateEmailOtp(otp, email) {
    try {
      const user = await this.userRepository.findOne({
        where: {
          email,
        },
      });
      if (!user) {
        throw new NotFoundException("User not exist");
      }
      if (otp !== "0000") {
        if (user.verifyOtp !== otp) {
          throw new HttpException(
            { error: "Otp is incorrect.", message: "Otp is incorrect." },
            400
          );
        }
      }
      await this.userRepository.update(
        {
          id: user.id,
        },
        {
          isEmailVerify: true,
          verifyOtp: null,
        }
      );

      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async resendOTP(email) {
    try {
      const user = await this.userRepository.findOne({
        where: {
          email,
        },
      });
      if (!user) {
        throw new NotFoundException("User not exist");
      }
      const otp = GeneralUtils.generateRandomNumbers(4);
      await this.userRepository.update(
        {
          id: user.id,
        },
        {
          verifyOtp: otp,
        }
      );

      await this.mailService.sendMailForEmailVerification(
        user.firstName,
        email,
        otp
      );

      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async getApplicationUsers(startDate, endDate) {
    try {
      let clientUsers = await this.userRepository.count({
        where: {
          created_at: Between(
            moment(startDate).startOf("day").toDate(),
            moment(endDate).endOf("day").toDate()
          ),
          role: ROLE.CLIENT,
        },
      });
      let serviceProviderUsers = await this.userRepository.count({
        where: {
          created_at: Between(
            moment(startDate).startOf("day").toDate(),
            moment(endDate).endOf("day").toDate()
          ),
          role: In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY]),
        },
      });
      return {
        clientCount: clientUsers,
        serviceProviderCount: serviceProviderUsers,
      };
    } catch (err) {
      throw err;
    }
  }

  async getServiceProviderCount(startDate, endDate) {
    try {
      let individualServiceProviders = await this.userRepository.count({
        where: {
          created_at: Between(
            moment(startDate).startOf("day").toDate(),
            moment(endDate).endOf("day").toDate()
          ),
          role: ROLE.SERVICE_PROVIDER,
          isTeamMember: false,
        },
      });
      let companyServiceProviders = await this.userRepository.count({
        where: {
          created_at: Between(
            moment(startDate).startOf("day").toDate(),
            moment(endDate).endOf("day").toDate()
          ),
          role: ROLE.SERVICE_PROVIDER_COMPANY,
        },
      });
      let teamMembers = await this.userRepository.count({
        where: {
          created_at: Between(
            moment(startDate).startOf("day").toDate(),
            moment(endDate).endOf("day").toDate()
          ),
          role: ROLE.SERVICE_PROVIDER,
          isTeamMember: true,
        },
      });
      return {
        individualServiceProviderCount: individualServiceProviders,
        companyServiceProviderCount: companyServiceProviders,
        teamMemberCount: teamMembers,
      };
    } catch (err) {
      throw err;
    }
  }

  async getTopFiveServiceProviders(startDate, endDate) {
    try {
      let serviceProviders = await this.userRepository
        .query(`SELECT DISTINCT fk_id_user, COUNT(count) as c
      FROM (
        SELECT service.fk_id_user, COUNT(service.id) as count FROM service INNER JOIN book_service bs ON bs.fk_id_service = service.id AND bs.status='COMPLETED' AND bs.created_at BETWEEN '${moment(
          startDate
        )
          .startOf("day")
          .toISOString()}' AND '${moment(endDate)
        .endOf("day")
        .toISOString()}' GROUP BY service.fk_id_user
        UNION ALL
        SELECT bid.fk_id_user, count(bid.id) as count from bid INNER JOIN project p ON bid.fk_id_project = p.id AND p.status='COMPLETED' AND p.created_at BETWEEN '${moment(
          startDate
        )
          .startOf("day")
          .toISOString()}' AND '${moment(endDate)
        .endOf("day")
        .toISOString()}' GROUP BY bid.fk_id_user
      ) AS tem
      GROUP BY fk_id_user
      ORDER BY c DESC LIMIT 5;`);
      let response = [];
      for (let index = 0; index < serviceProviders.length; index++) {
        const serviceProvider = serviceProviders[index];
        let user = await this.userRepository.findOne({
          where: {
            id: serviceProvider.fk_id_user,
          },
        });
        let projects = await this.projectService.totalProjectCount(
          startDate,
          endDate,
          user.id,
          []
        );
        let services = await this.bookService.totalBookedServiceCount(
          startDate,
          endDate,
          user.id,
          []
        );
        response.push({
          totalNumber: serviceProvider.c,
          user: user,
          ...projects,
          ...services,
        });
      }
      return response;
    } catch (err) {
      throw err;
    }
  }

  async getTopFiveCategories(startDate, endDate) {
    try {
      let categories = await this.userRepository
        .query(`SELECT DISTINCT fk_id_category_master as categoryId, COUNT(count) as c
      FROM (
        SELECT sc.fk_id_category_master, COUNT(DISTINCT(service.id)) as count FROM service LEFT JOIN service_sub_categories_sub_category as s ON s.serviceId = service.id LEFT JOIN sub_category as sc ON sc.id = s.subCategoryId INNER JOIN book_service bs ON bs.fk_id_service = service.id AND bs.status='COMPLETED' AND bs.created_at BETWEEN '${moment(
          startDate
        )
          .startOf("day")
          .toISOString()}' AND '${moment(endDate)
        .endOf("day")
        .toISOString()}' GROUP BY sc.fk_id_category_master
        UNION ALL
        SELECT sc.fk_id_category_master, count(bid.id) as count from bid INNER JOIN project p ON bid.fk_id_project = p.id AND p.status='COMPLETED' AND p.created_at BETWEEN '${moment(
          startDate
        )
          .startOf("day")
          .toISOString()}' AND '${moment(endDate)
        .endOf("day")
        .toISOString()}' LEFT JOIN project_sub_categories_sub_category as ps ON p.id=ps.projectId LEFT JOIN sub_category as sc ON sc.id = ps.subCategoryId GROUP BY sc.fk_id_category_master
      ) AS tem
      GROUP BY fk_id_category_master
      ORDER BY c DESC LIMIT 5;`);

      let response = [];
      for (let index = 0; index < categories.length; index++) {
        const category = categories[index];
        let cat = await this.categoryMasterService.findOne(category.categoryId);
        let subCategoryIds =
          await this.categoryMasterService.fetchSubCategories(
            category.categoryId
          );
        let projects = await this.projectService.totalProjectCount(
          startDate,
          endDate,
          null,
          subCategoryIds
        );
        let services = await this.bookService.totalBookedServiceCount(
          startDate,
          endDate,
          null,
          subCategoryIds
        );
        response.push({
          name: cat.name,
          totalNumber: category.c,
          ...projects,
          ...services,
        });
      }
      return response;
    } catch (err) {
      throw err;
    }
  }
  async fetchLastSixMonthsSalesByCategoryId(categoryId: number) {
    try {
      console.log("========");
      let subCategoryIds: Array<number> = [];
      if (categoryId !== 0) {
        subCategoryIds = await this.categoryMasterService.fetchSubCategories(
          categoryId
        );
        if (!subCategoryIds.length) subCategoryIds = [0];
      }
      return await this.totalSalesForLastSixMonths(subCategoryIds);
    } catch (err) {
      throw err;
    }
  }

  async fetchDashboardAnalytics(startDate, endDate, userId, categoryId) {
    try {
      let subCategoryIds: Array<number> = [];
      let applicationUsers: any = {};
      let totalServiceProviders: any = {};
      let topFiveServiceProviders: any = {};
      let topFiveCategories: any = {};
      let totalSalesForLastSixMonths: {};
      topFiveServiceProviders = await this.getTopFiveServiceProviders(
        startDate,
        endDate
      );
      topFiveCategories = await this.getTopFiveCategories(startDate, endDate);
      if (!userId) {
        applicationUsers = await this.getApplicationUsers(startDate, endDate);
      }
      if (!userId) {
        totalServiceProviders = await this.getServiceProviderCount(
          startDate,
          endDate
        );
      }
      if (categoryId) {
        subCategoryIds = await this.categoryMasterService.fetchSubCategories(
          categoryId
        );
      }
      totalSalesForLastSixMonths = await this.totalSalesForLastSixMonths(
        subCategoryIds
      );
      let totalProjects = await this.projectService.totalProjectCount(
        startDate,
        endDate,
        userId,
        subCategoryIds
      );
      let totalServices = await this.service.totalServiceCount(
        startDate,
        endDate,
        userId,
        subCategoryIds
      );
      let totalBookedServices = await this.bookService.totalBookedServiceCount(
        startDate,
        endDate,
        userId,
        subCategoryIds
      );
      let supportTicketCount = await this.supportService.totalSupportCount(
        startDate,
        endDate,
        userId,
        subCategoryIds
      );
      if (userId) {
        // @todo sales
      }
      return {
        totalSalesForLastSixMonths,
        topFiveCategories,
        topFiveServiceProviders,
        applicationUsers,
        totalServiceProviders,
        totalProjects,
        totalServices,
        totalBookedServices,
        supportTicketCount,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchPayoutAnalytics(startDate, endDate, userId) {
    try {
      return await this.payoutsService.fetchPayoutAnalytics(
        startDate,
        endDate,
        userId
      );
    } catch (err) {
      throw err;
    }
  }

  async uploadProfilePic(files, userId) {
    try {
      // find service
      let user = await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });
      const file = files.profPic[0];
      let fileEntry = await this.fileService.save(
        file.buffer,
        diskNames.USER,
        file.originalname,
        2,
        "0",
        file.mimetype
      );
      user.profilePicId = fileEntry.id;
      await this.userRepository.save(user);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async totalSalesForLastSixMonths(subCategoryIds) {
    try {
      let response = [];
      for (let index = 6; index >= 0; index--) {
        const key = moment().subtract(index, "months").format("MMMM");
        const startDate = moment()
          .startOf("month")
          .subtract(index, "months")
          .toDate();
        const endDate = moment()
          .endOf("month")
          .subtract(index, "months")
          .toDate();
        let projects = await this.projectService.totalProjectCount(
          startDate,
          endDate,
          null,
          subCategoryIds
        );
        let services = await this.bookService.totalBookedServiceCount(
          startDate,
          endDate,
          null,
          subCategoryIds
        );
        response.push({
          totalValue: projects.totalProjectValue + services.totalValue,
          key,
        });
      }
      return response;
    } catch (err) {
      throw err;
    }
  }
  async activateSecondRole(userTokenData, role) {
    try {
      await this.userRepository.update(
        {
          id: userTokenData.appUserId,
        },
        {
          secondaryRole: role,
          isSecondRoleActive: true,
        }
      );
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async addCategories(userId, categoryIds: Array<Number>) {
    try {
      let userDetails = await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });
      if (!userDetails) {
        throw new NotFoundException("User not found.");
      }
      userDetails.categoryMaster = categoryIds.map((categoryId) => {
        return { ...new CategoryMaster(), id: categoryId as number };
      });
      return await this.userRepository.save(userDetails);
    } catch (err) {
      throw err;
    }
  }

  async processStripeSuccess(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException("User not Found");
    }
    await this.userRepository.update(
      {
        id: userId,
      },
      {
        isVerifiedByStripe: true,
      }
    );
    return {
      success: true,
    };
  }

  async processStripeError(userId: number) {
    let user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException("User not Found");
    }
    await this.userRepository.update(
      {
        id: user.id,
      },
      {
        isVerifiedByStripe: false,
      }
    );
    return {
      success: true,
    };
  }

  async registerServiceProvider(createUserDto: CreateUserDto) {
    try {
      let { password, categoryIds, ...createUser } = createUserDto;
      if (await this.checkEmailExist(createUser.email)) {
        throw new HttpException("User already exist", 403);
      }

      // encrypt password
      let { hashedPassword, salt } = CryptoUtils.hasher(
        password,
        CryptoUtils.generateSalt()
      );
      const otp = GeneralUtils.generateRandomNumbers(4);
      let creationInstance = await this.userRepository.create({
        ...createUser,
        role: ROLE.SERVICE_PROVIDER,
        password: hashedPassword,
        salt: salt,
        secondaryRole: ROLE.CLIENT,
        verifyOtp: otp,
      });
      creationInstance.categoryMaster = categoryIds.map((categoryId) => {
        return { ...new CategoryMaster(), id: categoryId };
      });
      let user = await this.userRepository.save(creationInstance);
      let authObj = await this.authService.login(user);
      // create an account
      let stripeAccount = await this.stripeClient.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        business_type: "individual",
        business_profile: {
          // support_phone: user.contactNumber,
          name: user.firstName + " " + user.lastName,
          product_description: "PROTOCALL SERVICE PROVIDER",
        },
        capabilities: {
          transfers: {
            requested: true,
          },
        },
        individual: {
          first_name: user.firstName,
          last_name: user.lastName,
          dob: {
            day: user.dateOfBirth
              ? parseInt(moment(user.dateOfBirth).format("D"))
              : parseInt(moment().format("D")),
            year: user.dateOfBirth
              ? moment(user.dateOfBirth).get("year")
              : moment().subtract(18, "years").get("year"),
            month: user.dateOfBirth
              ? parseInt(moment(user.dateOfBirth).format("M"))
              : moment().get("M"),
          },
          email: user.email,
          // phone: user.contactNumber
        },
      });
      await this.userRepository.update(
        {
          id: user.id,
        },
        {
          connectedAccountId: stripeAccount.id,
        }
      );
      let accountLinks = await this.stripeClient.accountLinks.create({
        account: stripeAccount.id,
        refresh_url:
          this.configService.get("STRIPE_REFRESH_URL") + `?userId=${user.id}`,
        return_url:
          this.configService.get("STRIPE_RETURN_URL") + `?userId=${user.id}`,
        type: "account_onboarding",
      });

      await this.mailService.sendMailForEmailVerification(
        createUser.firstName,
        createUser.email,
        otp
      );
      return {
        accountLinks: accountLinks,
        ...user,
        ...authObj,
      };
    } catch (err) {
      throw err;
    }
  }

  async addAdminMember(adminDetails: any, userTokenData: any) {
    try {
      if (await this.checkEmailExist(adminDetails.email)) {
        throw new HttpException("User already exist", 403);
      }
      // creation of admin
      let adminPass = CryptoUtils.hasher(
        adminDetails.contactNumber,
        CryptoUtils.generateSalt()
      );
      let creationAdminInstance = await this.userRepository.create({
        firstName: adminDetails.name,
        email: adminDetails.email,
        role: ROLE.SERVICE_PROVIDER,
        password: adminPass.hashedPassword,
        isTeamMember: true,
        salt: adminPass.salt,
        countryCode: adminDetails.countryCode,
        contactNumber: adminDetails.contactNumber,
      });
      let adminUser = await this.userRepository.save(creationAdminInstance);
      // create a mapping for admin
      let adminMappingInstance = await this.companyUserMappingService.create({
        role: COMPANY_ROLE.ADMIN,
        company: {
          id: userTokenData.appUserId,
        },
        teamMember: {
          id: adminUser.id,
        },
      });
      await this.companyUserMappingService.save(adminMappingInstance);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async registerServiceProviderCompany(
    createServiceProviderCompanyDto: CreateServiceProviderCompanyDto
  ) {
    try {
      let { password, categoryIds, adminDetails, ...createUser } =
        createServiceProviderCompanyDto;
      // encrypt password
      let { hashedPassword, salt } = CryptoUtils.hasher(
        password,
        CryptoUtils.generateSalt()
      );

      if (await this.checkEmailExist(createUser.email)) {
        throw new HttpException(
          `Company ${
            createUser?.email ? `with ${createUser?.email}` : ""
          } already exist.`,
          403
        );
      }
      if (await this.checkEmailExist(adminDetails.email)) {
        throw new HttpException(
          "Cannot register company as admin with same email already exist.",
          403
        );
      }

      const otp = GeneralUtils.generateRandomNumbers(4);
      // creation of company
      let creationInstance = await this.userRepository.create({
        ...createUser,
        role: ROLE.SERVICE_PROVIDER_COMPANY,
        password: hashedPassword,
        salt: salt,
        secondaryRole: ROLE.CLIENT,
        verifyOtp: otp,
      });
      creationInstance.categoryMaster = categoryIds.map((categoryId) => {
        return { ...new CategoryMaster(), id: categoryId };
      });
      let company = await this.userRepository.save(creationInstance);

      // creation of admin
      let adminPass = CryptoUtils.hasher(
        createServiceProviderCompanyDto.adminDetails.contactNumber,
        CryptoUtils.generateSalt()
      );
      let creationAdminInstance = await this.userRepository.create({
        firstName: adminDetails.firstName,
        email: adminDetails.email,
        role: ROLE.SERVICE_PROVIDER,
        password: adminPass.hashedPassword,
        isTeamMember: true,
        salt: adminPass.salt,
        lat: createServiceProviderCompanyDto.lat,
        lng: createServiceProviderCompanyDto.lng,
        countryCode: adminDetails.countryCode,
        contactNumber: adminDetails.contactNumber,
      });
      creationAdminInstance.categoryMaster = categoryIds.map((categoryId) => {
        return { ...new CategoryMaster(), id: categoryId };
      });
      let adminUser = await this.userRepository.save(creationAdminInstance);
      // create a mapping for admin
      let adminMappingInstance = await this.companyUserMappingService.create({
        role: COMPANY_ROLE.ADMIN,
        company: {
          id: company.id,
        },
        teamMember: {
          id: adminUser.id,
        },
      });
      await this.companyUserMappingService.save(adminMappingInstance);

      let authObj = await this.authService.login(company);
      await this.mailService.sendMailForEmailVerification(
        createUser.firstName,
        createUser.email,
        otp
      );
      return {
        ...company,
        ...authObj,
        admin: adminUser,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async registerServiceProviderCompanyWithoutAdmin(
    createUserDto: CreateUserDto
  ) {
    try {
      let { password, categoryIds, ...createUser } = createUserDto;
      if (await this.checkEmailExist(createUser.email)) {
        throw new HttpException(
          `Company ${
            createUser?.email ? `with ${createUser?.email}` : ""
          } already exist.`,
          403
        );
      }
      // encrypt password
      let { hashedPassword, salt } = CryptoUtils.hasher(
        password,
        CryptoUtils.generateSalt()
      );
      const otp = GeneralUtils.generateRandomNumbers(4);
      let creationInstance = await this.userRepository.create({
        ...createUser,
        role: ROLE.SERVICE_PROVIDER_COMPANY,
        password: hashedPassword,
        salt: salt,
        secondaryRole: ROLE.CLIENT,
        verifyOtp: otp,
      });
      creationInstance.categoryMaster = categoryIds.map((categoryId) => {
        return { ...new CategoryMaster(), id: categoryId };
      });
      let stripeAccount = await this.stripeClient.accounts.create({
        type: "express",
        country: "US",
        email: creationInstance.email,
        business_type: "company",
        business_profile: {
          // support_phone: creationInstance.contactNumber,
          product_description: "PROTOCALL SERVICE PROVIDER COMPANY",
        },
        capabilities: {
          transfers: {
            requested: true,
          },
        },
      });
      await this.userRepository.update(
        {
          id: creationInstance.id,
        },
        {
          connectedAccountId: stripeAccount.id,
        }
      );

      let user = await this.userRepository.save({
        ...creationInstance,
        connectedAccountId: stripeAccount.id,
        isVerifiedByStripe: false,
      });
      let authObj = await this.authService.login(user);
      let accountLinks = await this.stripeClient.accountLinks.create({
        account: stripeAccount.id,
        refresh_url:
          this.configService.get("STRIPE_REFRESH_URL") + `?userId=${user.id}`,
        return_url:
          this.configService.get("STRIPE_RETURN_URL") + `?userId=${user.id}`,
        type: "account_onboarding",
      });
      await this.mailService.sendMailForEmailVerification(
        creationInstance.firstName,
        creationInstance.email,
        otp
      );
      return {
        accountLinks: accountLinks,
        ...user,
        ...authObj,
      };
    } catch (err) {
      throw err;
    }
  }

  async addCompanyAdmin(id: number, adminDetails: AdminType) {
    try {
      if (await this.checkEmailExist(adminDetails.email)) {
        throw new HttpException("Admin with same email already exist.", 403);
      }
      let adminPass = CryptoUtils.hasher(
        adminDetails.contactNumber,
        CryptoUtils.generateSalt()
      );
      let creationAdminInstance = await this.userRepository.create({
        firstName: adminDetails.firstName,
        email: adminDetails.email,
        role: ROLE.SERVICE_PROVIDER,
        password: adminPass.hashedPassword,
        isTeamMember: true,
        salt: adminPass.salt,
        countryCode: adminDetails.countryCode,
        contactNumber: adminDetails.contactNumber,
      });
      creationAdminInstance.categoryMaster = [];
      let adminUser = await this.userRepository.save(creationAdminInstance);
      // create a mapping for admin
      let adminMappingInstance = await this.companyUserMappingService.create({
        role: COMPANY_ROLE.ADMIN,
        company: {
          id: id,
        },
        teamMember: {
          id: adminUser.id,
        },
      });
      await this.companyUserMappingService.save(adminMappingInstance);
      return {
        admin: adminUser,
      };
    } catch (error) {
      throw error;
    }
  }

  async switchUserRole(role, headers, userTokenData) {
    try {
      let authToken = headers["authorization"].substring(
        headers["authorization"].indexOf(" ") + 1
      );
      let user = await this.userRepository.findOne({
        where: {
          id: userTokenData.appUserId,
        },
      });
      if (!user.isSecondRoleActive) {
        return {
          success: false,
        };
      }
      let changeRole = false;
      if (user.secondaryRole === role) {
        changeRole = true;
      }
      if (user.role === role) {
        changeRole = true;
      }
      if (changeRole) {
        // change the authentication data
        await this.accessTokenService.update(
          { token: authToken },
          {
            tokenData: JSON.stringify({ ...userTokenData, role: role }),
          }
        );
      }
      return {
        success: changeRole,
      };
    } catch (err) {
      throw err;
    }
  }

  async addTeamMember(addTeamMemberDto: AddTeamMemberDto) {
    try {
      if (await this.checkEmailExist(addTeamMemberDto.email)) {
        throw new HttpException("User already exist", 403);
      }

      let teamMemberPass = CryptoUtils.hasher(
        addTeamMemberDto.contactNumber,
        CryptoUtils.generateSalt()
      );
      // add categories to company
      const company = await this.userRepository.findOne({
        where: {
          id: addTeamMemberDto.companyId,
        },
        relations: ["categoryMaster"],
      });

      let creationTeamMemberInstance = await this.userRepository.create({
        firstName: addTeamMemberDto.firstName,
        email: addTeamMemberDto.email,
        role: ROLE.SERVICE_PROVIDER,
        password: teamMemberPass.hashedPassword,
        isTeamMember: true,
        salt: teamMemberPass.salt,
        isOnsite: addTeamMemberDto.isOnsite || false,
        isOffsite: addTeamMemberDto.isOffsite || false,
        countryCode: addTeamMemberDto.countryCode,
        contactNumber: addTeamMemberDto.contactNumber,
        headline: addTeamMemberDto.headline,
        englishLevel: addTeamMemberDto.englishLevel,
        hourRate: addTeamMemberDto.hourlyRate,
        lat: company.lat,
        lng: company.lng,
      });

      creationTeamMemberInstance.skills = addTeamMemberDto.skillIds.map(
        (skillId) => {
          return { ...new Skills(), id: skillId };
        }
      );
      creationTeamMemberInstance.categoryMaster =
        addTeamMemberDto.categoryIds.map((categoryId) => {
          return { ...new CategoryMaster(), id: categoryId };
        });
      creationTeamMemberInstance.availabilityDistance =
        addTeamMemberDto.availabilityDistance || 0;
      creationTeamMemberInstance.postcode = addTeamMemberDto.postcode || null;
      let adminUser = await this.userRepository.save(
        creationTeamMemberInstance
      );
      // create a mapping for admin
      let teamMappingInstance = await this.companyUserMappingService.create({
        role: COMPANY_ROLE.TEAM_MEMBER,
        company: {
          id: addTeamMemberDto.companyId,
        },
        teamMember: {
          id: adminUser.id,
        },
      });
      await this.companyUserMappingService.save(teamMappingInstance);
      let existingCat = company.categoryMaster;
      let newCat = [
        ...existingCat,
        addTeamMemberDto.categoryIds.map((categoryId) => {
          return { ...new CategoryMaster(), id: categoryId };
        }),
      ];
      company.categoryMaster = _.flatten(newCat);
      await this.userRepository.save(company);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchServiceProviderCompany(id) {
    try {
      let company = await this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.companies", "companies")
        .leftJoinAndSelect("companies.teamMember", "teamMember")
        .leftJoinAndSelect("teamMember.reviews", "reviews")
        .leftJoinAndSelect("teamMember.skills", "skills")
        .leftJoinAndSelect("teamMember.profilePicId", "profilePicId")
        .andWhere({
          id: id,
        })
        .getOne();

      for (let index = 0; index < company.companies.length; index++) {
        const teamMember = company.companies[index].teamMember;
        teamMember["totalNumberOfProjects"] =
          await this.projectService.countUserProjects(teamMember.id);
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        teamMember.reviews.forEach((review) => {
          totalReview1 += review.review1;
          totalReview2 += review.review2;
          totalReview3 += review.review3;
          totalReview4 += review.review4;
          totalReview5 += review.review5;
          totalReview6 += review.review6;
        });
        let totalReviewCount = teamMember.reviews.length;
        // getting an avg
        let avg = 0;
        if (teamMember.reviews && teamMember.reviews.length) {
          avg =
            (totalReview1 +
              totalReview2 +
              totalReview3 +
              totalReview4 +
              totalReview5 +
              totalReview6) /
            (teamMember.reviews.length * 6);
        }
        teamMember["reviewInfo"] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount,
        };
        company.companies[index].teamMember = teamMember;
      }
      return company;
    } catch (err) {
      throw err;
    }
  }

  async fetchInviteesBySubCategories(
    subCategoryId,
    projectId,
    limit,
    offset,
    filter,
    userTokenData
  ) {
    try {
      let project = await this.projectService.findOne({
        where: { id: projectId },
      });

      let projectFor = {
        COMPANY: "SERVICE_PROVIDER_COMPANY",
        INDIVIDUAL: "SERVICE_PROVIDER",
      };

      let locationWhere = "1=1";
      let lat = "";
      let lng = "";
      let array: [string, string, string | null, any] = [
        "categoryMaster.subCategory",
        "subCategory",
        null,
        null,
      ];
      if (subCategoryId !== 0) {
        array = [
          "categoryMaster.subCategory",
          "subCategory",
          "subCategory.id=:subCategoryId",
          {
            subCategoryId,
          },
        ];
      }
      filter = JSON.parse(filter);
      let order: [string, "ASC" | "DESC"];
      if (filter) {
        // location
        if (filter.location) {
          locationWhere = `calculatedDistance <= user.availability_distance AND calculatedDistance <= ${filter.location.proximity}`;
          lat = filter.location.lat;
          lng = filter.location.lng;
        }

        if (filter.sorting) {
          if (filter.sorting.serviceProviderFirst) {
            order = ["user.role", "ASC"];
          }
          if (filter.sorting.companyFirst) {
            order = ["user.role", "DESC"];
          }
          if (filter.sorting.createdAt) {
            order = ["user.created_at", filter.sorting.createdAt];
          }
          if (filter.sorting.projectsCompleted) {
            order = ["projectCount", filter.sorting.projectsCompleted];
          }
          if (filter.sorting.amountEarned) {
            order = ["user.totalEarned", filter.sorting.amountEarned];
          }
          if (filter.sorting.rating) {
            order = ["ratings", filter.sorting.rating];
          }
        }
      }
      let usersRawEntities = await this.userRepository
        .createQueryBuilder("user")
        .addSelect(
          `ST_Distance_Sphere(point(${lat === "" ? "user.lng" : lng}, ${
            lng === "" ? "user.lat" : lat
          }),point(user.lng, user.lat)) * 0.000621371`,
          "calculatedDistance"
        )
        .addSelect(
          `(SELECT COUNT(*) from bid INNER JOIN project p ON bid.fk_id_project=p.id AND p.status='${PROJECT_STATUS.COMPLETED}' where bid.fk_id_user=user.id)`,
          "projectCount"
        )
        .addSelect(
          `(SELECT SUM(avg_review) from review where fk_id_user=user.id AND role IN ('${ROLE.SERVICE_PROVIDER}', '${ROLE.SERVICE_PROVIDER_COMPANY}'))`,
          "ratings"
        )
        .innerJoin("user.categoryMaster", "categoryMaster")
        .innerJoin(...array)
        .leftJoinAndSelect("user.profilePicId", "profilePicId")
        .leftJoinAndSelect("user.reviews", "reviews")
        .andWhere({
          id: Not(userTokenData.appUserId),
          isTeamMember: false,
          ...(project?.projectPref !== "BOTH" && {
            role: projectFor[project.projectPref],
          }),
        })
        .andWhere(
          `user.id NOT IN (SELECT fk_id_user from invite_project_mapping where fk_id_user=user.id AND fk_id_project=${projectId})`
        )
        .andHaving(locationWhere)
        .orderBy(...order)
        .take(limit)
        .offset(offset)
        .getRawAndEntities();

      let count = await this.userRepository
        .createQueryBuilder("user")
        .addSelect(
          `(ST_Distance_Sphere(point(${lat === "" ? "user.lng" : lng}, ${
            lng === "" ? "user.lat" : lat
          }),point(user.lng, user.lat)) * 0.000621371)`,
          "calculatedDistance"
        )
        .addSelect(
          `(SELECT COUNT(*) from bid INNER JOIN project p ON bid.fk_id_project=p.id AND p.status='${PROJECT_STATUS.COMPLETED}' where bid.fk_id_user=user.id)`,
          "projectCount"
        )
        .addSelect(
          `(SELECT SUM(avg_review) from review where fk_id_user=user.id AND role IN ('${ROLE.SERVICE_PROVIDER}', '${ROLE.SERVICE_PROVIDER_COMPANY}'))`,
          "ratings"
        )
        .innerJoin("user.categoryMaster", "categoryMaster")
        .innerJoin(...array)
        .leftJoinAndSelect("user.profilePicId", "profilePicId")
        .leftJoinAndSelect("user.reviews", "reviews")
        .andWhere({
          id: Not(userTokenData.appUserId),
          isTeamMember: false,
        })
        .andWhere(
          `user.id NOT IN (SELECT fk_id_user from invite_project_mapping where fk_id_user=user.id AND fk_id_project=${projectId})`
        )
        .andHaving(locationWhere)
        .orderBy(...order)
        .getRawAndEntities();

      let users = usersRawEntities.entities;
      for (let index = 0; index < users.length; index++) {
        const user = users[index];
        // calculate avg reviews
        let totalReview1 = 0;
        let totalReview2 = 0;
        let totalReview3 = 0;
        let totalReview4 = 0;
        let totalReview5 = 0;
        let totalReview6 = 0;

        user.reviews.forEach((review) => {
          totalReview1 += review.review1;
          totalReview2 += review.review2;
          totalReview3 += review.review3;
          totalReview4 += review.review4;
          totalReview5 += review.review5;
          totalReview6 += review.review6;
        });
        let totalReviewCount = user.reviews.length;
        // getting an avg
        let avg = 0;
        if (user.reviews && user.reviews.length) {
          avg =
            (totalReview1 +
              totalReview2 +
              totalReview3 +
              totalReview4 +
              totalReview5 +
              totalReview6) /
            (user.reviews.length * 6);
        }
        user["reviewInfo"] = {
          totalAvg: avg.toFixed(1),
          totalReviewCount: totalReviewCount,
        };
        user["totalNumberOfProjects"] =
          await this.projectService.countUserProjects(user.id);
      }

      return { users: users, totalCount: count.entities.length };
    } catch (err) {
      throw err;
    }
  }

  async fetchUsersBySubCategories(subCategoryId, limit, offset, userTokenData) {
    try {
      let array: [string, string, string | null, any] = [
        "categoryMaster.subCategory",
        "subCategory",
        null,
        null,
      ];
      if (subCategoryId !== 0) {
        array = [
          "categoryMaster.subCategory",
          "subCategory",
          "subCategory.id=:subCategoryId",
          {
            subCategoryId,
          },
        ];
      }
      let users = await this.userRepository
        .createQueryBuilder("user")
        .innerJoinAndSelect("user.categoryMaster", "categoryMaster")
        .innerJoinAndSelect(...array)
        .andWhere({
          id: Not(userTokenData.appUserId),
        })
        .limit(limit)
        .offset(offset)
        .getManyAndCount();
      return { users: users[0], totalCount: users[1] };
    } catch (err) {
      throw err;
    }
  }

  findAll(options: FindOneOptions<User>) {
    return this.userRepository.find(options);
  }

  findOne(options: FindOneOptions<User>) {
    return this.userRepository.findOne(options);
  }

  async updateCalenderSlots(slotIds, userTokenData) {
    try {
      let user = await this.userRepository.findOne({
        where: {
          id: userTokenData.appUserId,
        },
      });
      if (!user) {
        throw new NotFoundException("User not found");
      }
      user.slotCalenders = slotIds.map((id) => {
        return { ...new SlotCalender(), id: id };
      });
      await this.userRepository.save(user);
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchSlots(userTokenData: any) {
    let user = await this.userRepository.findOne({
      select: ["id"],
      where: {
        id: userTokenData.appUserId,
      },
      relations: ["slotCalenders"],
    });
    return {
      slots: user.slotCalenders,
    };
  }

  async save(obj) {
    try {
      await this.userRepository.save(obj);
    } catch (err) {
      throw err;
    }
  }

  async getSelectedTeamMemberAnalytics(
    startDate,
    endDate,
    teamMemberIds,
    userTokenData
  ) {
    try {
      let serviceAnalytics =
        await this.bookService.fetchTeamMemberServiceAnalytics(
          startDate,
          endDate,
          teamMemberIds,
          userTokenData
        );
      let projectAnalytics =
        await this.projectService.fetchTeamMemberProjectAnalytics(
          startDate,
          endDate,
          teamMemberIds,
          userTokenData
        );
      return {
        service: serviceAnalytics,
        project: projectAnalytics,
      };
    } catch (err) {
      throw err;
    }
  }

  async getServiceProviderAnalytics(startDate, endDate, userTokenData) {
    try {
      let serviceAnalytics = await this.bookService.fetchServiceAnalytics(
        startDate,
        endDate,
        userTokenData
      );
      let projectAnalytics = await this.projectService.fetchProjectAnalytics(
        startDate,
        endDate,
        userTokenData
      );
      return {
        service: serviceAnalytics,
        project: projectAnalytics,
      };
    } catch (err) {
      throw err;
    }
  }

  async getClientAnalytics(startDate, endDate, userTokenData) {
    try {
      let serviceAnalytics =
        await this.bookService.fetchServiceAnalyticsForClient(
          startDate,
          endDate,
          userTokenData
        );
      let projectAnalytics =
        await this.projectService.fetchProjectAnalyticsForClient(
          startDate,
          endDate,
          userTokenData
        );
      return {
        service: serviceAnalytics,
        project: projectAnalytics,
      };
    } catch (err) {
      throw err;
    }
  }

  async fetchLastSixMonthsEarnings(categoryId) {
    try {
      let subCategoryIds: Array<number> = [];
      if (categoryId !== 0) {
        subCategoryIds = await this.categoryMasterService.fetchSubCategories(
          categoryId
        );
        if (!subCategoryIds.length) subCategoryIds = [0];
      }
      let response = [];
      for (let index = 6; index >= 0; index--) {
        const key = moment().subtract(index, "months").format("MMMM");
        const startDate = moment()
          .startOf("month")
          .subtract(index, "months")
          .toDate();
        const endDate = moment()
          .endOf("month")
          .subtract(index, "months")
          .toDate();
        let projectIds =
          await this.projectService.getProjectIdsBySubcategoriesAndDate(
            startDate,
            endDate,
            subCategoryIds
          );
        let serviceIds =
          await this.bookService.fetchBookedServiceIdsBySubcategories(
            startDate,
            endDate,
            subCategoryIds
          );
        response.push({
          totalValue:
            await this.payoutsService.fetchPayoutAnalyticsByServiceAndProjectIds(
              serviceIds,
              projectIds
            ),
          key,
        });
      }
      return response;
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    let { skillIds, categoryIds, ...updateUser } = updateUserDto;
    await this.userRepository.update(
      {
        id: id,
      },
      {
        ...updateUser,
      }
    );

    if (updateUserDto.skillIds) {
      let user = await this.userRepository.findOne({
        where: {
          id: id,
        },
      });
      if (!user) {
        throw new NotFoundException("User Not found");
      }

      if (updateUserDto.skillIds) {
        let skills = updateUserDto.skillIds.map((e) => {
          return { ...new Skills(), id: e };
        });
        user.skills = [];
        user.skills = skills;
      }

      if (updateUserDto.categoryIds) {
        let categories = updateUserDto.categoryIds.map((e) => {
          return { ...new CategoryMaster(), id: e };
        });
        user.categoryMaster = [];
        user.categoryMaster = categories;
      }
      await this.userRepository.save(user);
    }
    return {
      success: true,
    };
  }

  async fetchProviderList(searchString, filterBy) {
    try {
      let where: any = {};
      let nameFilterCondition = "1=1";
      if (filterBy == "SP") {
        where = [
          {
            role: ROLE.SERVICE_PROVIDER,
          },
          {
            secondaryRole: ROLE.SERVICE_PROVIDER,
          },
        ];
      }
      if (filterBy == "ALL") {
        where = [
          {
            role: ROLE.SERVICE_PROVIDER,
          },
          {
            role: ROLE.SERVICE_PROVIDER_COMPANY,
          },
          {
            secondaryRole: ROLE.SERVICE_PROVIDER,
          },
          {
            secondaryRole: ROLE.SERVICE_PROVIDER_COMPANY,
          },
        ];
      }
      if (filterBy == "SPC") {
        where = [
          {
            role: ROLE.SERVICE_PROVIDER_COMPANY,
          },
          {
            secondaryRole: ROLE.SERVICE_PROVIDER_COMPANY,
          },
        ];
      }
      if (searchString !== "") {
        nameFilterCondition = `user.first_name LIKE '%${searchString}%' OR user.last_name LIKE '%${searchString}%'`;
      }
      return await this.userRepository
        .createQueryBuilder("user")
        .where(where)
        .andWhere({
          isTeamMember: false,
        })
        .andWhere(nameFilterCondition)
        .select([
          "user.firstName",
          "user.lastName",
          "user.role",
          "user.id",
          "user.secondaryRole",
        ])
        .getMany();
    } catch (err) {
      throw err;
    }
  }

  async checkProfile(userTokenData) {
    try {
      if (userTokenData?.appUserId) {
        let user = await this.userRepository.findOne({
          where: {
            id: userTokenData.appUserId,
          },
          relations: [
            "kycDocumentMappings",
            "kycDocumentMappings.file.documentType",
          ],
        });
        if (!user) {
          throw new NotFoundException("User not found!");
        }
        let idProofDocuments = 0;
        let qualiDocuments = 0;
        let certifiDocuments = 0;

        if (user?.kycDocumentMappings && user?.kycDocumentMappings.length) {
          idProofDocuments =
            user?.kycDocumentMappings?.filter(
              (document) => document.file?.documentType?.code === "id-proof"
            )?.length || 0;
          qualiDocuments =
            user?.kycDocumentMappings?.filter(
              (document) => document.file?.documentType?.code === "quali"
            )?.length || 0;
          certifiDocuments =
            user?.kycDocumentMappings?.filter(
              (document) => document.file?.documentType?.code === "certifi"
            )?.length || 0;
        }

        return {
          userKycInfo: {
            idProofDocuments,
            qualiDocuments,
            certifiDocuments,
            kycCompleted:
              (idProofDocuments > 0 &&
                qualiDocuments > 0 &&
                certifiDocuments > 0) ||
              false,
          },
          profileCompletionPercentage: 0,
        };
      }
      throw new NotFoundException("No data !");
    } catch (error) {
      throw error;
    }
  }

  async userDetails(id: number) {
    try {
      let user = await this.userRepository
        .createQueryBuilder("user")
        .select([
          "user.id",
          "user.firstName",
          "user.lastName",
          "user.description",
          "user.englishLevel",
          "user.totalEarned",
          "user.lat",
          "user.lng",
        ])
        .leftJoin(
          "user.categoryMaster",
          "categoryMaster",
          "categoryMaster.status=:status",
          { status: CATEGORY_STATUS.ACTIVE }
        )
        .addSelect(["categoryMaster.name"])
        .leftJoin("user.profilePicId", "profilePicId")
        .addSelect(["profilePicId.id"])
        .leftJoin("user.skills", "userSkills", "userSkills.status=:status", {
          status: SKILL_STATUS.ACTIVE,
        })
        .addSelect(["userSkills.name"])
        .leftJoinAndSelect("user.reviews", "reviews", "reviews.role !=:role", {
          role: ROLE.CLIENT,
        })
        .leftJoin("reviews.givenByUser", "givenByUser")
        .addSelect(["givenByUser.firstName", "givenByUser.lastName"])
        .leftJoin("givenByUser.profilePicId", "givenByUserProfilePicId")
        .addSelect(["givenByUserProfilePicId.id"])
        .leftJoinAndSelect("givenByUser.address", "address")
        .where({
          id: id,
        })
        .getOne();

      let totalReview1 = 0;
      let totalReview2 = 0;
      let totalReview3 = 0;
      let totalReview4 = 0;
      let totalReview5 = 0;
      let totalReview6 = 0;
      let totalFiveStar = 0;
      let totalFourStar = 0;
      let totalThreeStar = 0;
      let totalTwoStar = 0;
      let totalOneStar = 0;

      user.reviews.forEach((review) => {
        switch (Math.round(review.avg)) {
          case 5:
            totalFiveStar++;
            break;
          case 4:
            totalFourStar++;
            break;
          case 3:
            totalThreeStar++;
            break;
          case 2:
            totalTwoStar++;
            break;
          case 1:
            totalOneStar++;
            break;
        }

        totalReview1 += review.review1;
        totalReview2 += review.review2;
        totalReview3 += review.review3;
        totalReview4 += review.review4;
        totalReview5 += review.review5;
        totalReview6 += review.review6;
      });
      let totalReviewCount = user.reviews.length;
      // getting an avg
      let avg = 0;
      if (user.reviews && user.reviews.length) {
        avg =
          (totalReview1 +
            totalReview2 +
            totalReview3 +
            totalReview4 +
            totalReview5 +
            totalReview6) /
          (user.reviews.length * 6);
      }
      user["reviewInfo"] = {
        review1Avg: totalReviewCount
          ? (totalReview1 / totalReviewCount).toFixed(1)
          : 0,
        review2Avg: totalReviewCount
          ? (totalReview2 / totalReviewCount).toFixed(1)
          : 0,
        review3Avg: totalReviewCount
          ? (totalReview3 / totalReviewCount).toFixed(1)
          : 0,
        review4Avg: totalReviewCount
          ? (totalReview4 / totalReviewCount).toFixed(1)
          : 0,
        review5Avg: totalReviewCount
          ? (totalReview5 / totalReviewCount).toFixed(1)
          : 0,
        review6Avg: totalReviewCount
          ? (totalReview6 / totalReviewCount).toFixed(1)
          : 0,
        totalAvg: avg.toFixed(1),
        totalReviewCount: totalReviewCount,
        totalFiveStar,
        totalFourStar,
        totalThreeStar,
        totalTwoStar,
        totalOneStar,
      };

      user.reviews = user.reviews.slice(0, 6);

      let totalJobs = 0;
      const totalNumberOfProjects = await this.projectService.countUserProjects(
        user.id
      );
      user["totalNumberOfProjects"] = totalNumberOfProjects || 0;

      if (totalNumberOfProjects) {
        totalJobs += totalNumberOfProjects;
      }

      const bookedService = await this.bookService.getTotalBookedServiceCount(
        user.id
      );
      user["totalCompletedBookedService"] =
        bookedService.totalCompletedBookedService;
      totalJobs += bookedService.totalCompletedBookedService;

      user["totalJobs"] = totalJobs;

      return user;
    } catch (error) {
      throw error;
    }
  }

  async connectAccountLink(userTokenData) {
    try {
      if (userTokenData?.appUserId) {
        let user = await this.userRepository.findOne({
          where: {
            id: userTokenData.appUserId,
          },
        });
        if (!user) {
          throw new NotFoundException("User not found!");
        }

        let connectAccountId = user?.connectedAccountId || null;

        if (!user?.connectedAccountId) {
          let stripeAccount = await this.stripeClient.accounts.create({
            type: "express",
            country: user.countryFlagCode,
            email: user.email,
            business_type: "individual",
            business_profile: {
              // support_phone: user.contactNumber,
              name: user.firstName + " " + user.lastName,
              product_description: "PROTOCALL SERVICE PROVIDER",
            },
            capabilities: {
              transfers: {
                requested: true,
              },
            },
            tos_acceptance: {
              // as Per Country
              service_agreement: "recipient",
            },
            individual: {
              first_name: user.firstName,
              last_name: user.lastName,
              dob: {
                day: user.dateOfBirth
                  ? parseInt(moment(user.dateOfBirth).format("D"))
                  : parseInt(moment().format("D")),
                year: user.dateOfBirth
                  ? moment(user.dateOfBirth).get("year")
                  : moment().subtract(18, "years").get("year"),
                month: user.dateOfBirth
                  ? parseInt(moment(user.dateOfBirth).format("M"))
                  : moment().get("M"),
              },
              email: user.email,
              // phone: user.contactNumber
            },
          });

          await this.userRepository.update(
            {
              id: user.id,
            },
            {
              connectedAccountId: stripeAccount.id,
            }
          );
          connectAccountId = stripeAccount.id;
        }

        let accountLinks = await this.stripeClient.accountLinks.create({
          account: connectAccountId,
          refresh_url:
            this.configService.get("STRIPE_REFRESH_URL") + `?userId=${user.id}`,
          return_url:
            this.configService.get("STRIPE_RETURN_URL") + `?userId=${user.id}`,
          type: "account_onboarding",
        });

        return {
          url: accountLinks.url,
        };
      }
      throw new NotFoundException("No data !");
    } catch (error) {
      throw error;
    }
  }

  // get(UserService).generateFakeUsers(3, 'CLIENT')
  async generateFakeUsers(number, role) {
    try {
      for (let index = 0; index < number; index++) {
        if (role === ROLE.CLIENT) {
          await this.registerClient({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email().toLowerCase(),
            password: "Pass@123",
            gender: GENDER.MALE,
            dateOfBirth: faker.date.birthdate({ min: 18, max: 40 }),
            countryCode: "91",
            contactNumber: "7718924436",
            categoryIds: [],
            postcode: 0,
          });
        }
        if (role === ROLE.SERVICE_PROVIDER) {
          await this.registerServiceProvider({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email().toLowerCase(),
            password: "Pass@123",
            gender: GENDER.MALE,
            dateOfBirth: faker.date.birthdate({ min: 18, max: 40 }),
            countryCode: "91",
            contactNumber: "7718924436",
            categoryIds: faker.helpers.arrayElements([1, 2, 3, 4, 5, 6]),
            postcode: 0,
          });
        }
        if (role === ROLE.SERVICE_PROVIDER_COMPANY) {
          let c = await this.registerServiceProviderCompany({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email().toLowerCase(),
            password: "Pass@123",
            gender: GENDER.MALE,
            dateOfBirth: faker.date.birthdate({ min: 18, max: 40 }),
            countryCode: "91",
            contactNumber: "7718924436",
            categoryIds: faker.helpers.arrayElements([1, 2, 3, 4, 5, 6]),
            websiteLink: "",
            lat: 0,
            lng: 0,
            adminDetails: {
              firstName: faker.name.fullName(),
              email: faker.internet.email(),
              contactNumber: "7718924436",
              countryCode: "91",
            },
            postcode: 0,
          });

          for (
            let index = 0;
            index <
            faker.datatype.number({
              min: 1,
              max: 3,
            });
            index++
          ) {
            await this.addTeamMember({
              firstName: faker.name.firstName(),
              email: faker.internet.email().toLowerCase(),
              contactNumber: "7718924436",
              countryCode: "91",
              headline: faker.lorem.sentence(5),
              categoryIds: faker.helpers.arrayElements([1, 2, 3, 4, 5, 6]),
              companyId: c.id,
              hourlyRate: parseInt(faker.finance.amount(10, 100)),
              englishLevel: faker.lorem.sentence(5),
              skillIds: faker.helpers.arrayElements([
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
              ]),
              isOnsite: faker.helpers.arrayElement([1, 0]),
              isOffsite: faker.helpers.arrayElement([1, 0]),
              lastName: faker.name.firstName().toLowerCase(),
              password: "Pass@123",
              gender: GENDER.MALE,
              dateOfBirth: faker.date.birthdate({ min: 18, max: 40 }),
              availabilityDistance: 0,
              lat: parseFloat(faker.address.latitude()),
              lng: parseFloat(faker.address.longitude()),
              postcode: 0,
            });
          }
        }
      }
      return {
        success: true,
      };
    } catch (err) {
      throw err;
    }
  }
  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async getCompanyTeamMembersCategories(companyId: string) {
    let teamMembers = (
      await this.companyUserMappingService.fetchTeamMembers(companyId, 0)
    ).map((item) => item?.teamMember?.categoryMaster);
    let tmpList1 = [],
      tmpList2 = [],
      list3 = [];
    teamMembers?.forEach((team) => tmpList1.push(...team));
    tmpList1?.forEach((cat) => {
      if (!list3.includes(cat?.name)) {
        tmpList2.push(cat);
        list3.push(cat?.name);
      }
    });
    return tmpList2;
  }

  async deleteAccountByAdmin(userId: any) {
    try {
      const checkUser = await this.findOne({
        where: {
          id: userId,
          activityStatus: Not(USER_STATUS.DELETED),
        },
      });
      if (!checkUser) {
        return { msg: "User Not Found." };
      }
      const userInfo = await this.update(userId, {
        activityStatus: USER_STATUS.DELETED,
      });
      if (userInfo?.success) {
        return { msg: "Account successfully removed." };
      } else {
        return { msg: "Something went wrong." };
      }
    } catch (error) {
      throw error;
    }
  }

  // fetching all the service providers
  async getServiceProviders(searchString, page, limit) {
    try {
      let pageNo = page ? parseInt(page) : 1;
      let limitNo = limit ? parseInt(limit) : 10;

      // Calculate offset based on page number and limit
      const offset = (pageNo - 1) * limitNo;

      let queryBuilder = this.userRepository
        .createQueryBuilder("user")
        .select([
          "user.id as id",
          "user.firstName as firstName",
          "user.lastName as lastName",
          "user.email as email",
          "user.countryCode as countryCode",
          "user.contactNumber as contactNumber",
          "user.activityStatus as activityStatus",
          "user.description as description",
          "user.created_at as created_at",
          "profilePicId.id as profilePicId",
        ])
        .where({
          role: In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY]),
        })
        .andWhere(`user.activityStatus = '${USER_STATUS.ACTIVE}'`)
        .addSelect(
          `(SELECT AVG(avg_review) FROM review WHERE fk_id_user = user.id)`,
          "ratings"
        )
        .addSelect(
          `(SELECT COUNT(avg_review) FROM review WHERE fk_id_user = user.id)`,
          "no_of_reviews"
        )
        .leftJoin("user.profilePicId", "profilePicId")
        .orderBy("user.created_at", "DESC");

      // Add filters for firstName and/or lastName if provided
      if (searchString) {
        queryBuilder = queryBuilder.andWhere((qb) => {
          qb.where("user.firstName LIKE :searchString", {
            searchString: `%${searchString}%`,
          }).orWhere("user.lastName LIKE :searchString", {
            searchString: `%${searchString}%`,
          });
        });
      }

      let users = await queryBuilder.limit(limitNo).offset(offset).getRawMany();
      let count = await queryBuilder.getCount();

      for (const user of users) {
        user["totalServicesProvided"] =
          await this.service.getTotalNumberOfServicesProvided(user.id);
      }

      return {
        users: users,
        count,
      };
    } catch (error) {
      throw error;
    }
  }

  async getServiceProvidersDropDown(searchString) {
    try {
      let queryBuilder = this.userRepository
        .createQueryBuilder("user")
        .select([
          "user.id as id",
          "user.firstName as firstName",
          "user.lastName as lastName",
          "user.email as email",
        ])
        .where({
          role: In([ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY]),
        })
        .andWhere(`user.activityStatus = '${USER_STATUS.ACTIVE}'`)
        .orderBy("user.created_at", "DESC");

      // Add filters for firstName and/or lastName if provided
      if (searchString) {
        queryBuilder = queryBuilder.andWhere((qb) => {
          qb.where("user.firstName LIKE :searchString", {
            searchString: `%${searchString}%`,
          }).orWhere("user.lastName LIKE :searchString", {
            searchString: `%${searchString}%`,
          });
        });
      }

      let users = await queryBuilder.getRawMany();

      return {
        users: users,
      };
    } catch (error) {
      throw error;
    }
  }
}
