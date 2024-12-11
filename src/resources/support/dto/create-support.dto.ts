import { IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateSupportDto {

  @IsString()
  @IsNotEmpty()
  isOpen: Boolean

  @IsString()
  @IsOptional()
  clientUserId: number

  @IsString()
  @IsOptional()
  serviceProviderUserId: number

  @IsString()
  @IsOptional()
  projectId: number
  
  @IsString()
  @IsOptional()
  serviceId: number

  @IsString()
  @IsOptional()
  description: string
}
