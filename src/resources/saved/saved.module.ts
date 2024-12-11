import { forwardRef, Module } from '@nestjs/common';
import { SavedService } from './saved.service';
import { SavedController } from './saved.controller';
import { Saved } from './entities/saved.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from '../project/project.module';
import { BidModule } from '../bid/bid.module';

@Module({
  imports: [TypeOrmModule.forFeature([Saved]), forwardRef(() => ProjectModule), forwardRef(() => BidModule)],
  controllers: [SavedController],
  providers: [SavedService],
  exports: [SavedService]
})
export class SavedModule { }
