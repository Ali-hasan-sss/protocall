import { PartialType } from '@nestjs/mapped-types';
import { CreateBookServiceDto } from './create-book-service.dto';

export class UpdateBookServiceDto extends PartialType(CreateBookServiceDto) {}
