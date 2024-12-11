import { Controller, Get, Post, Body, Patch, Param, Delete, Request, ClassSerializerInterceptor, UseGuards, UseInterceptors, Query, ParseBoolPipe, ParseIntPipe, HttpException, UploadedFiles } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Multer } from 'multer';
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) { }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post()
  create(@Body() createSupportDto: CreateSupportDto, @Request() req) {
    return this.supportService.create(createSupportDto, req.user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT, ROLE.ADMIN)
  @Post('updateClientChatCount/:id')
  updateClientChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.supportService.updateClientChatCount(id, chatCount, sendNotification);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('createGenericTicket')
  createGenericTicket(@Body('title') title: string, @Body('description') description: string, @Request() req) {
    return this.supportService.createGenericTicket(title, description, req.user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT, ROLE.ADMIN)
  @Post('updateProviderChatCount/:id')
  updateProviderChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.supportService.updateProviderChatCount(id, chatCount, sendNotification, req.user);
  }


  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Post('uploadSupportFile/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'supportFile', maxCount: 6 },
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
  async uploadImages(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: { profPic?: Multer.File[] }) {
    return await this.supportService.uploadSupportFile(files, id);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get()
  findAll(
    @Query('searchString') searchString: string,
    @Query('isOpen') isOpen: Boolean,
    @Query('role') role: ROLE | "BOTH",
    @Query('limit', ParseIntPipe) limit: number,
    @Query('offset', ParseIntPipe) offset: number,
    @Query('startDate') startDate: number,
    @Query('endDate') endDate: number,
    @Query('category') category: any,
    @Query("orderKey") orderKey: string,
    @Query("orderSeq") orderSeq: 'ASC' | 'DESC',
  ) {
    return this.supportService.findAll(searchString, isOpen, role, limit, offset, startDate, endDate, orderKey,orderSeq);
  }


  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get('fetchServiceProviderSupportTickets')
  fetchServiceProviderSupportTickets(
    @Query('isOpen', ParseBoolPipe) isOpen: Boolean,
    @Request() req,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('offset', ParseIntPipe) offset: number,
    ) {
    return this.supportService.fetchServiceProviderSupportTickets(isOpen, limit, offset, req.user);
  }


  @Patch('adminUpdate/:id')
  update(@Param('id') id: string, @Body() updateSupportDto: any) {
    return this.supportService.update(+id, updateSupportDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Patch(':id')
  updateIsOpen(@Param('id') id: string, @Query('isOpen', ParseBoolPipe) isOpen: Boolean, @Request() req) {
    return this.supportService.updateIsOpen(id, isOpen, req.user);
  }
}
