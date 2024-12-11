import { forwardRef, Module } from '@nestjs/common';
import { BookServiceService } from './book-service.service';
import { BookServiceController } from './book-service.controller';
import { BookService } from './entities/book-service.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressModule } from '../address/address.module';
import { UserSlotCalenderModule } from '../user-slot-calender/user-slot-calender.module';
import { Service } from '../services/entities/service.entity';
import { ServicesModule } from '../services/services.module';
import { UserModule } from '../user/user.module';
import { CompanyUserMappingModule } from '../company-user-mapping/company-user-mapping.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { PayoutsModule } from '../payouts/payouts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookService]),
    AddressModule,
    UserSlotCalenderModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => UserModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => CompanyUserMappingModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => CommissionsModule),
    forwardRef(() => PayoutsModule)
  ],
  controllers: [BookServiceController],
  providers: [BookServiceService],
  exports: [BookServiceService]
})
export class BookServiceModule { }
