import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateCategoryMasterDto } from './create-category_master.dto';

export class UpdateCategoryMasterDto extends PartialType(CreateCategoryMasterDto) {
  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Code cannot be empty'
  })
  code: string
}
