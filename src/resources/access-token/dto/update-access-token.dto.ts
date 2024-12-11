import { PartialType } from '@nestjs/mapped-types';
import { CreateAccessTokenDto } from './create-access-token.dto';

export class UpdateAccessTokenDto extends PartialType(CreateAccessTokenDto) { }
