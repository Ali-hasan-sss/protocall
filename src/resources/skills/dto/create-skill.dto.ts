import { IsEnum, IsInt, IsNotEmpty, IsString } from "class-validator"
import { SKILL_STATUS } from "src/global/enums"

export class CreateSkillDto {
  
  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Description cannot be empty'
  })
  description: string

  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Name cannot be empty'
  })
  keywords: Array<string>

  @IsEnum(SKILL_STATUS)
  status: SKILL_STATUS

  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Name cannot be empty'
  })
  name: string

  @IsInt({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Name cannot be empty'
  })
  categoryMasterId:number
}
