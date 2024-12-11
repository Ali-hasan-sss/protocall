import { Module } from '@nestjs/common';
import { SlotCalenderService } from './slot-calender.service';
import { SlotCalenderController } from './slot-calender.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotCalender } from './entities/slot-calender.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SlotCalender])],
  controllers: [SlotCalenderController],
  providers: [SlotCalenderService],
  exports: [SlotCalenderService]
})
export class SlotCalenderModule { }
