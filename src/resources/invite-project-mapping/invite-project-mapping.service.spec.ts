import { Test, TestingModule } from '@nestjs/testing';
import { InviteProjectMappingService } from './invite-project-mapping.service';

describe('InviteProjectMappingService', () => {
  let service: InviteProjectMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InviteProjectMappingService],
    }).compile();

    service = module.get<InviteProjectMappingService>(InviteProjectMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
