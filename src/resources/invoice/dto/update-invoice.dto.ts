import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @IsBoolean()
  @IsNotEmpty()
  arrivedAtLocation: Boolean
  
  @IsBoolean()
  @IsOptional()
  serviceStarted: Boolean

  @IsBoolean()
  @IsOptional()
  serviceEnded: Boolean

  @IsDateString()
  @IsOptional()
  serviceStartDate?: Date

  @IsDateString()
  @IsOptional()
  serviceEndDate?: Date

  @IsString()
  @IsOptional()
  extraCharges: string

  @IsString()
  @IsOptional()
  remarks: string

  @IsNumber()
  @IsNotEmpty()
  bookServiceId: number
}
