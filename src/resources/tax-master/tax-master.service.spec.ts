import { Test, TestingModule } from '@nestjs/testing';
import { TaxMasterService } from './tax-master.service';

describe('TaxMasterService', () => {
  let service: TaxMasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxMasterService],
    }).compile();

    service = module.get<TaxMasterService>(TaxMasterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
