import { IsBoolean, IsDate, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class CreateInvoiceDto {
  @IsBoolean()
  @IsNotEmpty()
  arrivedAtLocation: Boolean
  
  @IsNumber()
  @IsNotEmpty()
  bookServiceId: number
}
