import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateBidDto } from './create-bid.dto';

export class UpdateBidDto {
  @IsNumber()
  @IsOptional()
  @Min(1, {
    message: 'Cannot be less then $1'
  })
  bidAmount: number

  @IsString()
  @IsNotEmpty()
  description: string

  @IsBoolean()
  @IsOptional()
  isApproved: boolean

  @IsBoolean()
  @IsOptional()
  isShortListed: boolean
}
