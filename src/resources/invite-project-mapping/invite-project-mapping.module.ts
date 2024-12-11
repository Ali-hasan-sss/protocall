import { forwardRef, Module } from '@nestjs/common';
import { InviteProjectMappingService } from './invite-project-mapping.service';
import { InviteProjectMappingController } from './invite-project-mapping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteProjectMapping } from './entities/invite-project-mapping.entity';
import { ProjectModule } from 'src/resources/project/project.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteProjectMapping]),
    ProjectModule,
    forwardRef(()=>NotificationsModule),
    forwardRef(()=>UserModule)
  ],
  controllers: [InviteProjectMappingController],
  providers: [InviteProjectMappingService],
  exports: [InviteProjectMappingService]
})
export class InviteProjectMappingModule {}
