import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyUserMappingDto } from './create-company-user-mapping.dto';

export class UpdateCompanyUserMappingDto extends PartialType(CreateCompanyUserMappingDto) {}
