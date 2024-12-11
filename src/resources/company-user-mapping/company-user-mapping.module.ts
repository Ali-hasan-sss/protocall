import { forwardRef, Module } from '@nestjs/common';
import { CompanyUserMappingService } from './company-user-mapping.service';
import { CompanyUserMappingController } from './company-user-mapping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { CompanyUserMapping } from './entities/company-user-mapping.entity';
import { ProjectModule } from '../project/project.module';
import { UserSlotCalenderModule } from '../user-slot-calender/user-slot-calender.module';
import { BookServiceModule } from '../book-service/book-service.module';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyUserMapping]), ProjectModule, forwardRef(() => BookServiceModule), UserSlotCalenderModule],
  controllers: [CompanyUserMappingController],
  providers: [CompanyUserMappingService],
  exports: [CompanyUserMappingService]
})
export class CompanyUserMappingModule {}
