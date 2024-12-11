import { Test, TestingModule } from '@nestjs/testing';
import { UserKycDocumentMappingService } from './user-kyc-document-mapping.service';

describe('UserKycDocumentMappingService', () => {
  let service: UserKycDocumentMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserKycDocumentMappingService],
    }).compile();

    service = module.get<UserKycDocumentMappingService>(UserKycDocumentMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
