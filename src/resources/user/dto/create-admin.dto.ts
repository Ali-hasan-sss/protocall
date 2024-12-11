import { IsArray, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, ValidationOptions } from "class-validator"
import { GENDER, ROLE } from "src/global/enums"

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty(
    {
      message: 'First Name cannot be empty'
    }
  )
  firstName: string

  @IsString()
  @IsNotEmpty(
    {
      message: 'Last Name cannot be empty'
    }
  )
  lastName: string

  @IsString()
  @IsEmail({
    message: 'Invalid email'
  })
  @IsNotEmpty({
    message: 'Email cannot be empty'
  })
  email: string

  @IsString()
  @IsNotEmpty({
    message: 'Password cannot be empty'
  })
  password: string

  @IsString()
  @IsNotEmpty()
  @IsEnum(GENDER, {
    each: true
  })
  gender: GENDER

  @IsDateString({
    message: 'Invalid Date String'
  } as ValidationOptions)
  @IsNotEmpty({
    message: 'Date Of Birth cannot be empty'
  })
  dateOfBirth: Date

  @IsNotEmpty({
    message: 'Contact number cannot be empty'
  })
  @IsNumberString()
  countryCode: string

  @IsNotEmpty({
    message: 'Contact number cannot be empty'
  })
  @IsNumberString()
  contactNumber: string
}
