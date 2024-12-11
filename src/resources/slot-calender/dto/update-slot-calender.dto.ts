import { PartialType } from '@nestjs/mapped-types';
import { CreateSlotCalenderDto } from './create-slot-calender.dto';

export class UpdateSlotCalenderDto extends PartialType(CreateSlotCalenderDto) {}
