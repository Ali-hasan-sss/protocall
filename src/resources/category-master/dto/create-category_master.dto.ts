import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsString } from "class-validator"
import { CATEGORY_ASSOCIATE, CATEGORY_STATUS } from "src/global/enums"

export class CreateCategoryMasterDto {
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
  name: string

  @IsEnum(CATEGORY_STATUS)
  status: CATEGORY_STATUS

  @IsString()
  faq: string

  @IsString()
  icon: string

  @IsEnum(CATEGORY_ASSOCIATE)
  associate: CATEGORY_ASSOCIATE

  @IsArray()
  taxIds: Array<number>

  @IsBoolean()
  isTaxable: Boolean
}
