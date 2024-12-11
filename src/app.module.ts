import { Module } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { Service } from "./resources/services/entities/service.entity";
import { ServicesModule } from "./resources/services/services.module";
import { CategoryMasterModule } from "./resources/category-master/category-master.module";
import { CategoryMaster } from "./resources/category-master/entities/category-master.entity";
import { FileModule } from "./resources/file/file.module";
import { DocumentTypeModule } from "./resources/document-type/document-type.module";
import { File } from "./resources/file/entities/file.entity";
import { DocumentType } from "./resources/document-type/entities/document-type.entity";
import { ConfigModule, ConfigService } from "@nestjs/config";
import filesystem from "./config/filesystem";
import { StorageModule } from "@squareboat/nest-storage";
import { config } from "process";
import { ServeStaticModule } from "@nestjs/serve-static";
import { SubCategoryModule } from "./resources/sub-category/sub-category.module";
import { SubCategory } from "./resources/sub-category/entities/sub-category.entity";
import { BookServiceModule } from "./resources/book-service/book-service.module";
import { BookService } from "./resources/book-service/entities/book-service.entity";
import { AddressModule } from "./resources/address/address.module";
import { Address } from "./resources/address/entities/address.entity";
import { User } from "./resources/user/entities/user.entity";
import { UserModule } from "./resources/user/user.module";
import { AuthModule } from "./auth/auth.module";
import { AccessToken } from "./resources/access-token/entities/access-token.entity";
import { AccessTokenModule } from "./resources/access-token/access-token.module";
import { SlotCalenderModule } from "./resources/slot-calender/slot-calender.module";
import { SlotCalender } from "./resources/slot-calender/entities/slot-calender.entity";
import { UserSlotCalenderModule } from "./resources/user-slot-calender/user-slot-calender.module";
import { UserSlotCalender } from "./resources/user-slot-calender/entities/user-slot-calender.entity";
import { ReviewModule } from "./resources/review/review.module";
import * as path from "path";
import { Review } from "./resources/review/entities/review.entity";
import { InvoiceModule } from "./resources/invoice/invoice.module";
import { Invoice } from "./resources/invoice/entities/invoice.entity";
import { ProjectModule } from "./resources/project/project.module";
import { Project } from "./resources/project/entities/project.entity";
import { SkillsModule } from "./resources/skills/skills.module";
import { BidModule } from "./resources/bid/bid.module";
import { Bid } from "./resources/bid/entities/bid.entity";
import { InviteProjectMapping } from "./resources/invite-project-mapping/entities/invite-project-mapping.entity";
import { InviteProjectMappingModule } from "./resources/invite-project-mapping/invite-project-mapping.module";
import { MilestoneModule } from "./resources/milestone/milestone.module";
import { Milestone } from "./resources/milestone/entities/milestone.entity";
import { CompanyUserMappingModule } from "./resources/company-user-mapping/company-user-mapping.module";
import { CompanyUserMapping } from "./resources/company-user-mapping/entities/company-user-mapping.entity";
import { UserKycDocumentMappingModule } from "./resources/user-kyc-document-mapping/user-kyc-document-mapping.module";
import { UserKycDocumentMapping } from "./resources/user-kyc-document-mapping/entities/user-kyc-document-mapping.entity";
import { SupportModule } from "./resources/support/support.module";
import { Support } from "./resources/support/entities/support.entity";
import { SavedModule } from "./resources/saved/saved.module";
import { Saved } from "./resources/saved/entities/saved.entity";
import { Skills } from "./resources/skills/skills.entity";
import { CommissionsModule } from "./resources/commissions/commissions.module";
import { Commission } from "./resources/commissions/entities/commission.entity";
import { PaymentModule } from "./resources/payment/payment.module";
import { NotificationsModule } from "./resources/notifications/notifications.module";
import { Notification } from "./resources/notifications/entities/notification.entity";
import { DeviceModule } from "./resources/device/device.module";
import { Device } from "./resources/device/entities/device.entity";
import { ChatModule } from "./resources/chat/chat.module";
import { GoogleStrategy } from "./auth/google.strategy";
import { MailModule } from "./resources/mail/mail.module";
import { PayoutsModule } from "./resources/payouts/payouts.module";
import { Payout } from "./resources/payouts/entities/payout.entity";
import { ShareModule } from "./resources/share/share.module";
import { TaxMasterModule } from "./resources/tax-master/tax-master.module";
import { TaxMaster } from "./resources/tax-master/entities/tax-master.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [filesystem],
    }),
    StorageModule.registerAsync({
      imports: [ConfigService],
      useFactory: (config: ConfigService) => {
        return config.get("filesystem");
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, "../client"),
      exclude: ["/api*"],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        return {
          // logging:true,
          type: "mysql",
          host: "127.0.0.1",
          username: "nestuser",
          password: "CyperV123!@123",
          database: "protocall",
          port: 3306,
          entities: [
            Service,
            CategoryMaster,
            File,
            DocumentType,
            SubCategory,
            BookService,
            Address,
            User,
            AccessToken,
            SlotCalender,
            UserSlotCalender,
            BookService,
            Review,
            Invoice,
            Project,
            Bid,
            InviteProjectMapping,
            Milestone,
            CompanyUserMapping,
            UserKycDocumentMapping,
            Support,
            Saved,
            Skills,
            Commission,
            Notification,
            Device,
            Payout,
            TaxMaster,
          ],
          synchronize: true,
        } as TypeOrmModuleAsyncOptions;
      },
      inject: [ConfigService],
    }),
    MailModule,
    ServicesModule,
    CategoryMasterModule,
    FileModule,
    DocumentTypeModule,
    SubCategoryModule,
    BookServiceModule,
    UserModule,
    AddressModule,
    AuthModule,
    AccessTokenModule,
    SlotCalenderModule,
    UserSlotCalenderModule,
    ReviewModule,
    InvoiceModule,
    ProjectModule,
    SkillsModule,
    BidModule,
    InviteProjectMappingModule,
    MilestoneModule,
    CompanyUserMappingModule,
    UserKycDocumentMappingModule,
    SupportModule,
    SavedModule,
    CommissionsModule,
    PaymentModule,
    NotificationsModule,
    DeviceModule,
    ChatModule,
    PayoutsModule,
    ShareModule,
    TaxMasterModule,
  ],
  controllers: [AppController],
  providers: [AppService, GoogleStrategy],
  // providers: [AppService],
})
export class AppModule {}
