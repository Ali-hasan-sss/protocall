import { forwardRef, Module } from '@nestjs/common';
import { SubCategoryService } from './sub-category.service';
import { SubCategoryController } from './sub-category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubCategory } from './entities/sub-category.entity';
import { CategoryMasterModule } from '../category-master/category-master.module';
import { UserModule } from '../user/user.module';
import { ServicesModule } from '../services/services.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubCategory]), forwardRef(()=>CategoryMasterModule), forwardRef(()=>UserModule), forwardRef(()=>ServicesModule),forwardRef(()=>FileModule)],
  controllers: [SubCategoryController],
  providers: [SubCategoryService],
  exports:[SubCategoryService]
})
export class SubCategoryModule {}
