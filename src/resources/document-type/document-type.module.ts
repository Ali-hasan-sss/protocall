import { Module } from '@nestjs/common';
import { DocumentTypeService } from './document-type.service';
import { DocumentTypeController } from './document-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {DocumentType} from './entities/document-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentType])
  ],
  controllers: [DocumentTypeController],
  providers: [DocumentTypeService],
  exports: [DocumentTypeService]
})
export class DocumentTypeModule {}
