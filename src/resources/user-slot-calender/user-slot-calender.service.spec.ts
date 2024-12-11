import { Test, TestingModule } from '@nestjs/testing';
import { UserSlotCalenderService } from './user-slot-calender.service';

describe('UserSlotCalenderService', () => {
  let service: UserSlotCalenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSlotCalenderService],
    }).compile();

    service = module.get<UserSlotCalenderService>(UserSlotCalenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
