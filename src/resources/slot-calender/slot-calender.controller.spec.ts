import { Test, TestingModule } from '@nestjs/testing';
import { SlotCalenderController } from './slot-calender.controller';
import { SlotCalenderService } from './slot-calender.service';

describe('SlotCalenderController', () => {
  let controller: SlotCalenderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlotCalenderController],
      providers: [SlotCalenderService],
    }).compile();

    controller = module.get<SlotCalenderController>(SlotCalenderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
