import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotCalenderModule } from '../slot-calender/slot-calender.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserSlotCalenderModule } from '../user-slot-calender/user-slot-calender.module';
import { FileModule } from '../file/file.module';
import { ReviewModule } from '../review/review.module';
import { ProjectModule } from '../project/project.module';
import { CompanyUserMappingModule } from '../company-user-mapping/company-user-mapping.module';
import { AccessTokenModule } from '../access-token/access-token.module';
import { ServicesModule } from '../services/services.module';
import { BookServiceModule } from '../book-service/book-service.module';
import { SkillsModule } from '../skills/skills.module';
import { CategoryMasterModule } from '../category-master/category-master.module';
import { SupportModule } from '../support/support.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BidModule } from '../bid/bid.module';
import { InviteProjectMappingModule } from '../invite-project-mapping/invite-project-mapping.module';
import { PayoutsModule } from '../payouts/payouts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SlotCalenderModule,
    forwardRef(() => AuthModule),
    UserSlotCalenderModule,
    FileModule,
    ReviewModule,
    ProjectModule,
    CompanyUserMappingModule,
    forwardRef(() => AccessTokenModule),
    forwardRef(() => BookServiceModule),
    forwardRef(() => CategoryMasterModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => SupportModule),
    forwardRef(() => MailModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => BidModule),
    forwardRef(() => InviteProjectMappingModule),
    forwardRef(() => PayoutsModule)
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule { }
