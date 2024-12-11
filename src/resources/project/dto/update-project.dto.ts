import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsArray, IsJSON, IS_DATE_STRING, IsDateString } from 'class-validator';
import { COST_TYPE, PROJECT_PREFS, PROJECT_STATUS } from 'src/global/enums';
import { SubCategoryExists } from 'src/validators/sub-category-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  description: string

  @IsString()
  @IsOptional()
  headline: string

  @IsString()
  @IsOptional()
  bidEndingString: string

  @IsEnum(COST_TYPE, {
    each: true
  })
  costType: COST_TYPE

  @IsString()
  @IsOptional()
  serviceMinCost: number

  @IsString()
  @IsOptional()
  serviceMaxCost: number

  @IsString()
  @IsOptional()
  projectLength: string

  @IsEnum(PROJECT_PREFS, {
    each: true
  })
  projectPref: PROJECT_PREFS

  @IsEnum(PROJECT_STATUS, {
    each: true
  })
  status: PROJECT_STATUS

  @IsString()
  @IsOptional()
  englishLevel: string

  @IsDateString()
  @IsOptional()
  biddingEndDate: Date

  @IsArray({
    message: 'Must be array'
  })
  @SubCategoryExists()
  subCategories: Array<number>

  @IsArray({
    message: 'Must be array'
  })
  milestones: Array<any>
}
