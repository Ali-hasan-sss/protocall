import { IsNotEmpty, IsString } from "class-validator";

export class CreateBookServiceDto {
  @IsString()
  @IsNotEmpty()
  receiverName: string

  @IsString()
  @IsNotEmpty()
  receiverEmail: string

  @IsNotEmpty()
  address: any

  @IsNotEmpty()
  slots: any

  @IsNotEmpty()
  serviceId: any
}
