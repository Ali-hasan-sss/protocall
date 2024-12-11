import { forwardRef, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DeviceModule } from '../device/device.module';
import { HttpModule } from '@nestjs/axios';
import { BookServiceModule } from '../book-service/book-service.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DeviceModule,
    HttpModule,
    forwardRef(() =>ProjectModule),
    forwardRef(() => BookServiceModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule { }
