import { IsArray, IsBoolean, IsEnum, IsNumber, IsString } from "class-validator"
import { COMMISSIONS_STATUS, COMMISSION_ROLE } from "src/global/enums"

export class CreateCommissionDto {

  @IsNumber()
  public percentage: number

  @IsString()
  public description: string

  @IsEnum(COMMISSIONS_STATUS)
  public status: COMMISSIONS_STATUS

  @IsEnum(COMMISSION_ROLE)
  public role: COMMISSION_ROLE

  @IsBoolean()
  public isAppliedToAll: Boolean

  @IsBoolean()
  public isAppliedToSp: Boolean

  @IsBoolean()
  public isAppliedToSpc: Boolean

  @IsArray()
  public userIds: Array<number>
}
