import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenController } from './access-token.controller';
import { AccessTokenService } from './access-token.service';

describe('AccessTokenController', () => {
  let controller: AccessTokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessTokenController],
      providers: [AccessTokenService],
    }).compile();

    controller = module.get<AccessTokenController>(AccessTokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
