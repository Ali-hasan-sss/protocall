import { IsString, IsEmail, IsEnum, IsDateString, ValidationOptions, IsNumberString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { GENDER, USER_STATUS } from 'src/global/enums';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsString()
  @IsEmail()
  @IsOptional({
    message: 'Email cannot be empty'
  })
  email?: string

  @IsString()
  @IsOptional()
  password?: string

  @IsString()
  @IsOptional()
  @IsEnum(GENDER, {
    each: true
  })
  gender?: GENDER

  @IsDateString({
    message: 'Invalid Date String'
  } as ValidationOptions)
  @IsOptional()
  dateOfBirth?: Date

  @IsOptional()
  @IsNumberString()
  countryCode?: string

  @IsOptional()
  @IsNumberString()
  contactNumber?: string

  @IsString()
  @IsOptional()
  @IsEnum(USER_STATUS, {
    each: true
  })
  activityStatus?: USER_STATUS

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isKycDone?: boolean

  @IsOptional()
  @IsBoolean()
  isOnsite?: boolean

  @IsOptional()
  @IsBoolean()
  isOffsite?: boolean

  @IsOptional()
  @IsArray()
  skillIds?: Array<number>

  @IsArray({
    message: 'Invalid Category type'
  })
  @IsOptional()
  categoryIds?: Array<number>

  @IsDateString({
    message: 'Invalid Date String'
  } as ValidationOptions)
  @IsOptional()
  deletedAt?: Date
}
