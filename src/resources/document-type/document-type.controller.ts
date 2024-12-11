import { Controller } from '@nestjs/common';
import { DocumentTypeService } from './document-type.service';

@Controller('document-type')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}
}
