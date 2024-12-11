import { Test, TestingModule } from '@nestjs/testing';
import { CategoryMasterController } from './category-master.controller';
import { CategoryMasterService } from './category-master.service';

describe('CategoryMasterController', () => {
  let controller: CategoryMasterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryMasterController],
      providers: [CategoryMasterService],
    }).compile();

    controller = module.get<CategoryMasterController>(CategoryMasterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
