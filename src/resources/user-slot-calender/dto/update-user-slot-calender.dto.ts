import { PartialType } from '@nestjs/mapped-types';
import { CreateUserSlotCalenderDto } from './create-user-slot-calender.dto';

export class UpdateUserSlotCalenderDto extends PartialType(CreateUserSlotCalenderDto) {}
