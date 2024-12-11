import { IsNotEmpty, IsNumber } from "class-validator";

export class CreatePayoutDto {
  
  @IsNotEmpty()
  @IsNumber()
  madeByClient: number;

  @IsNotEmpty()
  @IsNumber()
  commission: number;

  @IsNotEmpty()
  @IsNumber()
  payableToSP: number;

  @IsNotEmpty()
  @IsNumber()
  netEarning: number;

  @IsNumber()
  serviceId: number;

  @IsNumber()
  projectId: number;

  @IsNumber()
  clientUserId: number;

  @IsNumber()
  serviceProviderUserId: number;

  @IsNumber()
  taxAmount: number;

  @IsNumber()
  milestoneId: number;

  @IsNumber()
  bookServiceId?: number;

}
