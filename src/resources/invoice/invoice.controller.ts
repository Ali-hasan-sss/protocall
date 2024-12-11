import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, ParseIntPipe, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) { }

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Post('upload/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'serviceStartPicture', maxCount: 6 },
    { name: 'serviceEndPicture', maxCount: 6 },
  ] as Array<MulterField>, {
    limits: {
      fileSize:  1024 * 1024 * 6,
      files: 6
    },
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
        return cb(new HttpException({
          status: 400,
          error: `Only image files are allowed`
        }, 400), false);
      }
      return cb(null, true);
    }
  } as MulterOptions))
  async uploadImages(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: { serviceStartPicture?: Multer.File[], serviceEndPicture?: Multer.File[] }) {
    return await this.invoiceService.uploadImages(files, id);
  }

  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get('downloadInvoiceById/:id')
  downloadInvoiceById(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    return this.invoiceService.downloadInvoice(id, res);
  }

  @Get(':bookingId')
  findOne(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.invoiceService.findOne(bookingId);
  }

  @Patch()
  update(@Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(updateInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(+id);
  }
}
