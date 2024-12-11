import { Test, TestingModule } from '@nestjs/testing';
import { SlotCalenderService } from './slot-calender.service';

describe('SlotCalenderService', () => {
  let service: SlotCalenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlotCalenderService],
    }).compile();

    service = module.get<SlotCalenderService>(SlotCalenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
