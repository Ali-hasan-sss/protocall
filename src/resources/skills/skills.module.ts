import { forwardRef, Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skills } from './skills.entity';
import { CategoryMasterModule } from '../category-master/category-master.module';

@Module({
  imports: [TypeOrmModule.forFeature([Skills]), forwardRef(()=>CategoryMasterModule)],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService]
})
export class SkillsModule {}
