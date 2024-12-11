import { forwardRef, Module } from '@nestjs/common';
import { BidService } from './bid.service';
import { BidController } from './bid.controller';
import { Bid } from './entities/bid.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from '../project/project.module';
import { ReviewModule } from '../review/review.module';
import { Review } from '../review/entities/review.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bid, Review,User]), forwardRef(() => ProjectModule), forwardRef(() => NotificationsModule)],
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService]
})
export class BidModule { }
