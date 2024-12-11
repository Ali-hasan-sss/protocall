import { Test, TestingModule } from '@nestjs/testing';
import { CompanyUserMappingController } from './company-user-mapping.controller';
import { CompanyUserMappingService } from './company-user-mapping.service';

describe('CompanyUserMappingController', () => {
  let controller: CompanyUserMappingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyUserMappingController],
      providers: [CompanyUserMappingService],
    }).compile();

    controller = module.get<CompanyUserMappingController>(CompanyUserMappingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
