import { IsString, IsNotEmpty, IsDateString } from "class-validator"

export class CreateAccessTokenDto {
  @IsString()
  @IsNotEmpty()
  public token: string

  @IsString()
  @IsNotEmpty()
  public refreshToken: string

  @IsDateString()
  @IsNotEmpty()
  public tokenExpiry?: Date

  @IsDateString()
  @IsNotEmpty()
  public refreshTokenExpiry?: Date

  @IsString()
  @IsNotEmpty()
  public tokenData?: string
}
