import { Test, TestingModule } from '@nestjs/testing';
import { CategoryMasterService } from './category-master.service';

describe('CategoryMasterService', () => {
  let service: CategoryMasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryMasterService],
    }).compile();

    service = module.get<CategoryMasterService>(CategoryMasterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
