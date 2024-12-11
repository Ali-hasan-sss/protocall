import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateDeviceDto {

  @IsNumber()
  @IsNotEmpty()
  public userId: number

  @IsString()
  @IsNotEmpty()
  public fcmToken: string

  @IsString()
  @IsNotEmpty()
  public deviceName: string

  @IsString()
  @IsNotEmpty()
  public uniqueId: string
}
