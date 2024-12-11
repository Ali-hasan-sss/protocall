import { PartialType } from '@nestjs/mapped-types';
import { CreateInviteProjectMappingDto } from './create-invite-project-mapping.dto';

export class UpdateInviteProjectMappingDto extends PartialType(CreateInviteProjectMappingDto) {}
