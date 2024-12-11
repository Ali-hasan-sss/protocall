import { Test, TestingModule } from '@nestjs/testing';
import { InviteProjectMappingController } from './invite-project-mapping.controller';
import { InviteProjectMappingService } from './invite-project-mapping.service';

describe('InviteProjectMappingController', () => {
  let controller: InviteProjectMappingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteProjectMappingController],
      providers: [InviteProjectMappingService],
    }).compile();

    controller = module.get<InviteProjectMappingController>(InviteProjectMappingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
