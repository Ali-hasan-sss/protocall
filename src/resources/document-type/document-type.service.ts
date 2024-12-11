import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { DocumentType } from './entities/document-type.entity';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectRepository(DocumentType) private documentTypeRepository: Repository<DocumentType>
  ) { }

  public async seedDocumentTypeData() {
    try {
      console.log('****************** SEEDING DOCUMENT TYPE DATA *********************')

      let baseData: Array<DeepPartial<DocumentType>> = [
        {
          id: 1,
          name: 'Service',
          description: 'These Documents are used for service images.',
          config: JSON.stringify({}),
          code: 'ser'
        },
        {
          id: 2,
          name: 'Profile Picture',
          description: 'This is a profile picture of a user',
          config: JSON.stringify({}),
          code: 'prof-pic'
        },
        {
          id: 3,
          name: 'Invoice Start Picture',
          description: 'This is a Invoice Start of a user',
          config: JSON.stringify({}),
          code: 'inv-start'
        },
        {
          id: 4,
          name: 'Invoice End Picture',
          description: 'This is a Invoice End of a user',
          config: JSON.stringify({}),
          code: 'inv-end'
        },
        {
          id: 5,
          name: 'ID Proof',
          description: 'This is a ID proof of a user',
          config: JSON.stringify({}),
          code: 'id-proof'
        },
        {
          id: 6,
          name: 'Qualifications',
          description: 'This is a qualifications of a user',
          config: JSON.stringify({}),
          code: 'quali'
        },
        {
          id: 7,
          name: 'Certifications',
          description: 'This is a Certifications of a user',
          config: JSON.stringify({}),
          code: 'certifi'
        }
      ]
      let createInstance = await this.documentTypeRepository.create(baseData);
      await this.documentTypeRepository.save(createInstance);

      console.log('***************** SEEDING DOCUMENT TYPE DATA DONE ******************')
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
