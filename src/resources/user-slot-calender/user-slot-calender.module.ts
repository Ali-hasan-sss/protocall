import { forwardRef, Module } from '@nestjs/common';
import { UserSlotCalenderService } from './user-slot-calender.service';
import { UserSlotCalenderController } from './user-slot-calender.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSlotCalender } from './entities/user-slot-calender.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { CompanyUserMapping } from '../company-user-mapping/entities/company-user-mapping.entity';
import { BookServiceModule } from '../book-service/book-service.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserSlotCalender, User, CompanyUserMapping]),forwardRef(() => BookServiceModule)],
  controllers: [UserSlotCalenderController],
  providers: [UserSlotCalenderService],
  exports: [UserSlotCalenderService]
})
export class UserSlotCalenderModule { }
