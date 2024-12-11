import { forwardRef, Module } from '@nestjs/common';
import { CategoryMasterService } from './category-master.service';
import { CategoryMasterController } from './category-master.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryMaster } from './entities/category-master.entity';
import { UserModule } from '../user/user.module';
import { ServicesModule } from '../services/services.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryMaster]), forwardRef(() => UserModule), forwardRef(()=>ServicesModule), forwardRef(()=> FileModule)],
  controllers: [CategoryMasterController],
  providers: [CategoryMasterService],
  exports: [CategoryMasterService]
})
export class CategoryMasterModule { }
