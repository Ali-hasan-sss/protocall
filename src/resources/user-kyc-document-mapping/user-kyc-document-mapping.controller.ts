import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, Request, ParseIntPipe, UploadedFiles, UseInterceptors, UseGuards, Query, ParseArrayPipe } from '@nestjs/common';
import { UserKycDocumentMappingService } from './user-kyc-document-mapping.service';
import { CreateUserKycDocumentMappingDto } from './dto/create-user-kyc-document-mapping.dto';
import { UpdateUserKycDocumentMappingDto } from './dto/update-user-kyc-document-mapping.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('user-kyc-document-mapping')
export class UserKycDocumentMappingController {
  constructor(private readonly userKycDocumentMappingService: UserKycDocumentMappingService) { }

  @Post()
  create(@Body() createUserKycDocumentMappingDto: CreateUserKycDocumentMappingDto) {
    return this.userKycDocumentMappingService.create(createUserKycDocumentMappingDto);
  }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('uploadKycDocuments')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'id-proof', maxCount: 6 },
    { name: 'quali', maxCount: 6 },
    { name: 'certifi', maxCount: 6 },
  ] as Array<MulterField>, {
    limits: {
      fileSize: 1024 * 1024 * 18,
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
  async uploadKycDocuments(@UploadedFiles() files: { profPic?: Multer.File[] }, @Query('replaceMappingId', ParseArrayPipe) replaceMappingId: Array<Number>, @Request() req) {
    return await this.userKycDocumentMappingService.uploadKycDocuments(files, replaceMappingId, req.user);
  }

  @Get()
  findAll() {
    return this.userKycDocumentMappingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userKycDocumentMappingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserKycDocumentMappingDto: UpdateUserKycDocumentMappingDto) {
    return this.userKycDocumentMappingService.update(+id, updateUserKycDocumentMappingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userKycDocumentMappingService.remove(+id);
  }
}
