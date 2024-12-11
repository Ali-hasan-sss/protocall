import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from './entities/payout.entity';
import { CommissionsModule } from '../commissions/commissions.module';
import { Milestone } from '../milestone/entities/milestone.entity';
import { Project } from '../project/entities/project.entity';
import { Bid } from '../bid/entities/bid.entity';
import { BookService } from '../book-service/entities/book-service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, Milestone,Project,Bid,BookService]), CommissionsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService]
})

export class PayoutsModule { }
