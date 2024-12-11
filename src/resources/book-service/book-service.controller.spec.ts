import { Test, TestingModule } from '@nestjs/testing';
import { BookServiceController } from './book-service.controller';
import { BookServiceService } from './book-service.service';

describe('BookServiceController', () => {
  let controller: BookServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookServiceController],
      providers: [BookServiceService],
    }).compile();

    controller = module.get<BookServiceController>(BookServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
