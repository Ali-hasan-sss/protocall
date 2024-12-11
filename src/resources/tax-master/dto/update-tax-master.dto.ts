import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxMasterDto } from './create-tax-master.dto';

export class UpdateTaxMasterDto extends PartialType(CreateTaxMasterDto) {}
