import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, ValidationOptions } from "class-validator"
import { GENDER, ROLE } from "src/global/enums"
import { Entity } from "typeorm"
import { CreateUserDto } from "./create-user.dto"

type AdminType = {
  name: string,
  email: string,
  contactNumber: string,
  countryCode: string
}
export class AddTeamMemberDto extends CreateUserDto {
  
  @IsString()
  @IsOptional()
  headline: string

  @IsNumber()
  @IsOptional()
  hourlyRate: number

  @IsString()
  @IsOptional()
  englishLevel: string

  @IsNumber()
  @IsOptional()
  companyId: number

  @IsBoolean()
  @IsOptional()
  isOnsite: number

  @IsBoolean()
  @IsOptional()
  isOffsite: number

  @IsArray()
  @IsOptional()
  skillIds: Array<number>

  @IsNumber()
  @IsOptional()
  availabilityDistance: number

  @IsNumber()
  @IsOptional()
  lat: number

  @IsNumber()
  @IsOptional()
  lng: number

  @IsNumber()
  @IsOptional()
  postcode: number
}
