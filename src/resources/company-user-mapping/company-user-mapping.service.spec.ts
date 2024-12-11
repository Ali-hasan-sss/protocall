import { Test, TestingModule } from '@nestjs/testing';
import { CompanyUserMappingService } from './company-user-mapping.service';

describe('CompanyUserMappingService', () => {
  let service: CompanyUserMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyUserMappingService],
    }).compile();

    service = module.get<CompanyUserMappingService>(CompanyUserMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
