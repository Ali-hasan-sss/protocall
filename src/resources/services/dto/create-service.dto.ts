import { IsArray, IsEnum, IsJSON, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"
import { COST_TYPE } from "src/global/enums"
import { SubCategoryExists } from "src/validators/sub-category-validator"

export class CreateServiceDto {

  @IsString()
  @IsNotEmpty()
  headline: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsEnum(COST_TYPE, {
    each: true
  })
  costType: COST_TYPE

  @IsString()
  @IsNotEmpty()
  serviceCost: number

  @IsNumber()
  @IsOptional()
  visitingCharges: number

  @IsNumber()
  @IsOptional()
  cancellationCharges:number

  @IsArray({
    message: 'Must be array'
  })
  @SubCategoryExists()
  subCategories: Array<number>

  @IsArray({
    message: 'Must be array'
  })
  inclusions: Array<String>

  @IsArray({
    message: 'Must be array'
  })
  nonInclusions: Array<String>

  @IsJSON({
    message: 'Invalid type'
  })
  faq: string
}
