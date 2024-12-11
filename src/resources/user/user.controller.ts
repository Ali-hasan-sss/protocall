import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseGuards,
  Query,
  HttpException,
  UploadedFiles,
  ParseIntPipe,
  ParseArrayPipe,
  ParseEnumPipe,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/auth/guards/role.guards";
import {
  CATEGORY_STATUS,
  COMPANY_ROLE,
  ROLE,
  USER_STATUS,
} from "src/global/enums";
import { Multer } from "multer";
import { Roles } from "src/validators/role.decorator";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  MulterField,
  MulterOptions,
} from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import {
  AdminType,
  CreateServiceProviderCompanyDto,
} from "./dto/create-service-provider-company.dto";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { filter } from "rxjs";
import { Not } from "typeorm";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * POST APIS GOES HERE
   */

  // Fetch service providers list
  // @UseGuards(AuthGuard("bearer"), RolesGuard)
  // @Roles(ROLE.CLIENT)
  @Get("/getServiceProvider")
  async getServiceProviders(
    @Query("searchString") searchString: string,
    @Query("page") page: number,
    @Query("limit") limit: number
  ) {
    return this.userService.getServiceProviders(searchString, page, limit);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("registerClient")
  registerClient(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerClient(createUserDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("validateEmailOtp")
  validateEmailOtp(@Body("otp") otp: string, @Body("email") email: string) {
    return this.userService.validateEmailOtp(otp, email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("resendOTP")
  resendOTP(@Body("email") email: string) {
    return this.userService.resendOTP(email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("sentRestPasswordOtp")
  sentRestPasswordOtp(@Body("email") email: string) {
    return this.userService.sentRestPasswordOtp(email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("validateOtp")
  validateOtp(@Body("otp") otp: string, @Body("email") email: string) {
    return this.userService.validateOtp(otp, email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("resetPassword")
  resetPassword(
    @Body("password") password: string,
    @Body("email") email: string
  ) {
    return this.userService.resetPassword(password, email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("registerAdmin")
  registerAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.userService.registerAdmin(createAdminDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("externalLogin")
  externalLogin(@Body() externalLoginBody: any) {
    return this.userService.externalLogin(externalLoginBody);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("attemptExternalLogin")
  attemptExternalLogin(@Body() externalLoginBody: any) {
    return this.userService.attemptExternalLogin(externalLoginBody);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.CLIENT, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post("switchUserRole")
  switchUserRole(@Body("role") role: ROLE, @Request() req) {
    return this.userService.switchUserRole(role, req.headers, req.user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("addCategories/:id")
  addCategories(
    @Param("id", ParseIntPipe) id: number,
    @Body() addCategoryDto: Array<Number>
  ) {
    return this.userService.addCategories(id, addCategoryDto);
  }

  @Post("uploadProfilePic/:id")
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: "profPic", maxCount: 6 }] as Array<MulterField>,
      {
        limits: {
          fileSize: 1024 * 1024 * 6,
          files: 6,
        },
        fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
            return cb(
              new HttpException(
                {
                  status: 400,
                  error: `Only image files are allowed`,
                },
                400
              ),
              false
            );
          }
          return cb(null, true);
        },
      } as MulterOptions
    )
  )
  async uploadImages(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() files: { profPic?: Multer.File[] }
  ) {
    return await this.userService.uploadProfilePic(files, id);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("registerServiceProvider")
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerServiceProvider(createUserDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("registerServiceProviderCompany")
  createCompany(
    @Body() createServiceProviderCompanyDto: CreateServiceProviderCompanyDto
  ) {
    return this.userService.registerServiceProviderCompany(
      createServiceProviderCompanyDto
    );
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("registerServiceProviderCompanyWithoutAdmin")
  createCompanyWithoutAdmin(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerServiceProviderCompanyWithoutAdmin(
      createUserDto
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @UseInterceptors(ClassSerializerInterceptor)
  @Post("addCompanyAdmin/:id")
  addCompanyAdmin(
    @Param("id", ParseIntPipe) id: number,
    @Body() adminDetails: AdminType
  ) {
    return this.userService.addCompanyAdmin(id, adminDetails);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post("addTeamMember")
  addTeamMember(@Body() addTeamMemberDto: AddTeamMemberDto) {
    return this.userService.addTeamMember(addTeamMemberDto);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT, ROLE.SERVICE_PROVIDER)
  @Post("addAdminMember")
  addAdminMember(@Body() addAdminMember: any, @Request() req) {
    return this.userService.addAdminMember(addAdminMember, req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get("/getClientCount")
  async getClientCount(@Request() req) {
    return await this.userService.getClientCount(req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("/getProviderCount")
  async getProviderCount(@Request() req) {
    return await this.userService.getProviderCount(req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("getServiceProviderAnalytics")
  getServiceProviderAnalytics(
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate,
    @Request() req
  ) {
    return this.userService.getServiceProviderAnalytics(
      startDate,
      endDate,
      req.user
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("getSelectedTeamMemberAnalytics")
  getSelectedTeamMemberAnalytics(
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate,
    @Query("teamMemberIds", ParseArrayPipe) teamMemberIds: Array<number>,
    @Request() req
  ) {
    return this.userService.getSelectedTeamMemberAnalytics(
      startDate,
      endDate,
      teamMemberIds,
      req.user
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get("getClientAnalytics")
  getClientAnalytics(
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate,
    @Request() req
  ) {
    return this.userService.getClientAnalytics(startDate, endDate, req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("fetchProviderList")
  fetchProviderList(
    @Query("searchString") searchString: string,
    @Query("filterBy") filterBy: "ALL" | "SP" | "SPC"
  ) {
    return this.userService.fetchProviderList(searchString, filterBy);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("/fetchSlots")
  fetchSlots(@Request() req) {
    return this.userService.fetchSlots(req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get("/fetchUsersBySubCategory")
  fetchUsersBySubCategories(
    @Query("subCategoryId", ParseIntPipe) subCategoryId: number,
    @Query("limit", ParseIntPipe) limit: number,
    @Query("offset", ParseIntPipe) offset,
    @Request() req
  ) {
    return this.userService.fetchUsersBySubCategories(
      subCategoryId,
      limit,
      offset,
      req.user
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get("/fetchInviteesBySubCategories")
  fetchInviteesBySubCategories(
    @Query("subCategoryId", ParseIntPipe) subCategoryId: number,
    @Query("projectId", ParseIntPipe) projectId: number,
    @Query("limit", ParseIntPipe) limit: number,
    @Query("offset", ParseIntPipe) offset,
    @Query("filter") filter: any,
    @Request() req
  ) {
    return this.userService.fetchInviteesBySubCategories(
      subCategoryId,
      projectId,
      limit,
      offset,
      filter,
      req.user
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/fetchUserList")
  fetchUserList(
    @Query("status") status: "ALL" | USER_STATUS,
    @Query("searchString") searchString: string,
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
    @Query("limit") limit: number,
    @Query("offset") offset: number,
    @Query("orderKey") orderKey: string,
    @Query("orderSeq") orderSeq: "ASC" | "DESC",
    @Request() req
  ) {
    return this.userService.fetchUserList(
      status,
      searchString,
      startDate,
      endDate,
      limit,
      offset,
      orderKey,
      orderSeq
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/fetchPayoutAnalytics")
  fetchPayoutAnalytics(
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
    @Query("userId") userId: number
  ) {
    return this.userService.fetchPayoutAnalytics(startDate, endDate, userId);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/fetchDashboardAnalytics")
  fetchDashboardAnalytics(
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
    @Query("userId") userId: number,
    @Query("categoryId") categoryId: number
  ) {
    return this.userService.fetchDashboardAnalytics(
      startDate,
      endDate,
      userId,
      categoryId
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/SixMonthsSalesByCategoryId")
  fetchLastSixMonthsSalesByCategoryId(
    @Query("categoryId", ParseIntPipe) categoryId: number
  ) {
    return this.userService.fetchLastSixMonthsSalesByCategoryId(categoryId);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/fetchLastSixMonthsEarnings")
  fetchLastSixMonthsEarnings(
    @Query("categoryId", ParseIntPipe) categoryId: number
  ) {
    return this.userService.fetchLastSixMonthsEarnings(categoryId);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get("/fetchUserById/:id")
  fetchUserById(@Param("id") id: number, @Request() req) {
    return this.userService.fetchUserById(id);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch("/updateStatus/:id")
  updateStatus(
    @Param("id") id: number,
    @Body("status", new ParseEnumPipe(USER_STATUS)) status: USER_STATUS,
    @Request() req
  ) {
    return this.userService.updateStatus(id, status);
  }

  // @Get('/fetchReviews/:id')
  // fetchReviews(@Param('id') id: string) {
  //   return this.userService.fetchReviews(id);
  // }
  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("fetchServiceProviderCompany")
  fetchServiceProviderCompany(@Request() req) {
    return this.userService.fetchServiceProviderCompany(req.user.appUserId);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER, ROLE.CLIENT)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    let user = await this.userService.findOne({
      where: {
        id: +id,
        activityStatus: Not(USER_STATUS.DELETED),
      },
      relations: [
        "kycDocumentMappings",
        "kycDocumentMappings.file.documentType",
      ],
    });
    if (!user) {
      return new Error("User not found.");
    }
    user["currentActiveRole"] = req.user.role;
    user["dialCode"] = user.countryCode;

    user.categoryMaster.filter((cM) => cM.status === CATEGORY_STATUS.ACTIVE);

    if (user.role === ROLE.SERVICE_PROVIDER_COMPANY) {
      let companyUser = await this.userService.findOne({
        where: {
          id: +id,
        },
        relations: ["companies"],
      });

      let categories = await this.userService.getCompanyTeamMembersCategories(
        id
      );
      if (categories?.length !== 0) {
        user.categoryMaster = categories;
      }
      if (
        companyUser &&
        companyUser.companies &&
        companyUser.companies.length
      ) {
        const adminUser =
          companyUser.companies.find(
            (companyUser) => companyUser.role === COMPANY_ROLE.ADMIN
          ) || null;
        if (adminUser) {
          user["adminDetails"] = adminUser.teamMember || null;
        }
      }
    }
    return user;
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER, ROLE.CLIENT)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get("/details/:id")
  async userDetails(@Param("id") id: string) {
    return await this.userService.userDetails(+id);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER, ROLE.CLIENT)
  @Get("/kycDocuments/:id")
  async findKYC(
    @Param("id") id: string,
    @Query("docType") docType: string = "all",
    @Request() req
  ) {
    try {
      let user = await this.userService.findOne({
        where: {
          id: +id,
        },
        relations: [
          "kycDocumentMappings",
          "kycDocumentMappings.file.documentType",
        ],
      });
      if (!user) {
        throw new NotFoundException("User with provided userId not found!");
      }
      if (user?.kycDocumentMappings && user?.kycDocumentMappings.length) {
        if (docType !== "all") {
          return {
            documents:
              user?.kycDocumentMappings?.filter(
                (document) => document.file?.documentType?.code === docType
              ) || [],
          };
        }
        return {
          documents: user?.kycDocumentMappings || [],
        };
      }
      return {
        documents: [],
      };
    } catch (err) {
      throw err;
    }
  }

  @Get("stripe-connect/success")
  async processStripeSuccess(@Query("partnerDetailId") partnerId: number) {
    return await this.userService.processStripeSuccess(partnerId);
  }

  @Get("stripe-connect/error")
  async processStripeError(@Query("partnerDetailId") partnerId: number) {
    return await this.userService.processStripeError(partnerId);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER, ROLE.CLIENT)
  @Get("/checkProfile/status")
  async checkProfileStatus(@Request() req) {
    return await this.userService.checkProfile(req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER)
  @Get("/connect/accountLink")
  async connectAccountLink(@Request() req) {
    return await this.userService.connectAccountLink(req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER)
  @Patch("/updateCalenderSlots")
  updateCalenderSlots(@Request() req, @Body() updateCalenderSlots: any) {
    return this.userService.updateCalenderSlots(
      updateCalenderSlots.slotIds,
      req.user
    );
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.CLIENT, ROLE.SERVICE_PROVIDER_COMPANY)
  @Patch("/updatePassword")
  updatePassword(
    @Request() req,
    @Body("oldPassword") oldPassword: string,
    @Body("newPassword") newPassword: string
  ) {
    return this.userService.updatePassword(oldPassword, newPassword, req.user);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.CLIENT, ROLE.SERVICE_PROVIDER_COMPANY)
  @Patch("/activateSecondRole")
  activateSecondRole(@Request() req, @Body("role") role: ROLE) {
    return this.userService.activateSecondRole(req.user, role);
  }

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Delete("/remove-account")
  async deleteAccountByAdmin(@Query("userId") userId) {
    return this.userService.deleteAccountByAdmin(userId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.userService.remove(+id);
  }
}
