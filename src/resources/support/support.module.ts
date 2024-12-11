import { forwardRef, Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { Support } from './entities/support.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from '../project/project.module';
import { ReviewModule } from '../review/review.module';
import { FileService } from '../file/file.service';
import { FileModule } from '../file/file.module';
import { BidModule } from '../bid/bid.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Support]),
    forwardRef(() => ProjectModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ReviewModule),
    forwardRef(() => FileModule),
    forwardRef(() => BidModule),
    forwardRef(() => UserModule)
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService]
})
export class SupportModule { }
