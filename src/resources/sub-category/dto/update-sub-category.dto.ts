import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNotEmpty } from 'class-validator';
import { CreateSubCategoryDto } from './create-sub-category.dto';

export class UpdateSubCategoryDto extends PartialType(CreateSubCategoryDto) {
  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Code cannot be empty'
  })
  code: string
}
