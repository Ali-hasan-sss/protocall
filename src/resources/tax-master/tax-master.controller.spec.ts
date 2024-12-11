import { Test, TestingModule } from '@nestjs/testing';
import { TaxMasterController } from './tax-master.controller';
import { TaxMasterService } from './tax-master.service';

describe('TaxMasterController', () => {
  let controller: TaxMasterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxMasterController],
      providers: [TaxMasterService],
    }).compile();

    controller = module.get<TaxMasterController>(TaxMasterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
