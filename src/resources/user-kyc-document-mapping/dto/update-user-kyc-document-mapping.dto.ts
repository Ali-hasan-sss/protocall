import { PartialType } from '@nestjs/mapped-types';
import { CreateUserKycDocumentMappingDto } from './create-user-kyc-document-mapping.dto';

export class UpdateUserKycDocumentMappingDto extends PartialType(CreateUserKycDocumentMappingDto) {}
