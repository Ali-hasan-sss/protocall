import { forwardRef, Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { BookServiceModule } from '../book-service/book-service.module';
import { FileModule } from '../file/file.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PDFModule, PDFModuleOptions } from '@t00nday/nestjs-pdf';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    BookServiceModule,
    FileModule,
    forwardRef(()=>NotificationsModule),
    PDFModule.registerAsync({
      useFactory: (): PDFModuleOptions => ({
          view: {
              root: path.resolve(__dirname,'..','..','templates'),
              engine: 'pug',
          },
      }),
  })
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService]
})
export class InvoiceModule { }
