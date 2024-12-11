import { Test, TestingModule } from '@nestjs/testing';
import { UserKycDocumentMappingController } from './user-kyc-document-mapping.controller';
import { UserKycDocumentMappingService } from './user-kyc-document-mapping.service';

describe('UserKycDocumentMappingController', () => {
  let controller: UserKycDocumentMappingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserKycDocumentMappingController],
      providers: [UserKycDocumentMappingService],
    }).compile();

    controller = module.get<UserKycDocumentMappingController>(UserKycDocumentMappingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
