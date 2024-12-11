import { forwardRef, Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { FileService } from '../file/file.service';
import { FileModule } from '../file/file.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from '../user/user.module';
import { BookServiceModule } from '../book-service/book-service.module';
import { UserSlotCalenderModule } from '../user-slot-calender/user-slot-calender.module';
import { User } from '../user/entities/user.entity';
import { SavedModule } from '../saved/saved.module';
import { AccessTokenModule } from '../access-token/access-token.module';
import { CategoryMasterModule } from '../category-master/category-master.module';

@Module({
  imports: [TypeOrmModule.forFeature([Service,User]), FileModule, BookServiceModule, UserSlotCalenderModule,forwardRef(()=>SavedModule),forwardRef(()=>CategoryMasterModule), AccessTokenModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService]
})
export class ServicesModule { }
