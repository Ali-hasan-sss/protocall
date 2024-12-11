import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateSkillDto } from './create-skill.dto';

export class UpdateSkillDto extends PartialType(CreateSkillDto) {
  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Code cannot be empty'
  })
  code: string
}
