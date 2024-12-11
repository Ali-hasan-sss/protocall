import { forwardRef, Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { MilestoneModule } from '../milestone/milestone.module';
import { BidModule } from '../bid/bid.module';
import { Review } from '../review/entities/review.entity';
import { UserModule } from '../user/user.module';
import { SavedModule } from '../saved/saved.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { Milestone } from '../milestone/entities/milestone.entity';
import { PaymentService } from '../payment/payment.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Review, Milestone]),
    MilestoneModule,
    BidModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => UserModule),
    forwardRef(() => SavedModule),
    forwardRef(() => PayoutsModule),
    forwardRef(() => CommissionsModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => PaymentModule)
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule { }
