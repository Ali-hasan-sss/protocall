import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { CreateMilestoneDto } from './create-milestone.dto';

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  title: string

  @IsString()
  @IsOptional()
  remarks: string

  @IsNumber()
  @IsOptional()
  daysToComplete: number

  @IsNumber()
  @IsOptional()
  paymentToBeReleased: number

  @IsNumber()
  @IsOptional()
  buffer: number

  @IsString()
  @IsOptional()
  timeSheet: string

  @IsString()
  @IsOptional()
  deliverables: string

  @IsBoolean()
  @IsOptional()
  isCompleted: boolean

  @IsBoolean()
  @IsOptional()
  paymentRequestMade: boolean
}
