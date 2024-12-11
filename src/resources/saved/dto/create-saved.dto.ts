import { IsNumber, IsOptional } from "class-validator"

export class CreateSavedDto {

  @IsNumber()
  @IsOptional()
  projectId: number

  @IsNumber()
  @IsOptional()
  serviceId: number
}
