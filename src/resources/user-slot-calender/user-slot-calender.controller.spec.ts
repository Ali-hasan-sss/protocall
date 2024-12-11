import { Test, TestingModule } from '@nestjs/testing';
import { UserSlotCalenderController } from './user-slot-calender.controller';
import { UserSlotCalenderService } from './user-slot-calender.service';

describe('UserSlotCalenderController', () => {
  let controller: UserSlotCalenderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSlotCalenderController],
      providers: [UserSlotCalenderService],
    }).compile();

    controller = module.get<UserSlotCalenderController>(UserSlotCalenderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
