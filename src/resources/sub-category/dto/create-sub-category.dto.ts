import { IsString, IsNotEmpty, IsInt, IsEnum, IsArray, IsBoolean } from "class-validator"
import { SUB_CATEGORIES_STATUS } from "src/global/enums"

export class CreateSubCategoryDto {
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

  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Name cannot be empty'
  })
  name: string

  @IsEnum(SUB_CATEGORIES_STATUS)
  status: SUB_CATEGORIES_STATUS

  @IsInt({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Name cannot be empty'
  })
  categoryMasterId: number
}
