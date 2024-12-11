import { IsArray, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, ValidationOptions } from "class-validator"
import { GENDER, ROLE } from "src/global/enums"
import { Entity } from "typeorm"
import { CreateUserDto } from "./create-user.dto"

export type AdminType = {
  firstName: string,
  email: string,
  contactNumber: string,
  countryCode: string
}
export class CreateServiceProviderCompanyDto extends CreateUserDto {
  
  @IsString()
  @IsOptional()
  websiteLink: string

  @IsNumber()
  @IsOptional()
  lat: number

  @IsNumber()
  @IsOptional()
  lng: number

  @IsOptional()
  adminDetails: AdminType
}
