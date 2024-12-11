import { forwardRef, Module } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { MilestoneController } from './milestone.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Milestone } from './entities/milestone.entity';
import { FileModule } from '../file/file.module';
import { ProjectModule } from '../project/project.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BidModule } from '../bid/bid.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Milestone]),
    FileModule,
    forwardRef(()=>PaymentModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => BidModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => CommissionsModule),
    forwardRef(() => PayoutsModule),
    forwardRef(() => UserModule),
  ],
  controllers: [MilestoneController],
  providers: [MilestoneService],
  exports: [MilestoneService]
})
export class MilestoneModule {}
