import { Controller, Get, HttpException, Param, ParseIntPipe, Post, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileService } from './file.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Multer } from 'multer';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @Get(':id')
  async fetchFile(@Param('id', ParseIntPipe) id: number, @Res() res) {
    return await this.fileService.fetch(id, res);
  }


  @Post('upload')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 6 },
  ] as Array<MulterField>, {
    limits: {
      fileSize:  1024 * 1024 * 6,
      files: 6
    },
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp|pdf)$/)) {
        return cb(new HttpException({
          status: 400,
          error: `Only image files are allowed`
        }, 400), false);
      }
      return cb(null, true);
    }
  } as MulterOptions))
  async upload(@UploadedFiles() files: { image?: Multer.File[] }) {
    return await this.fileService.upload(files);
  }
}
