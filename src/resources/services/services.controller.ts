import { Controller, Get, Post, Body, Patch, Param, Request, Delete, HttpException, Query, UploadedFiles, UseInterceptors, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { Multer } from 'multer';
import { UpdateServiceDto } from './dto/update-service.dto';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE, SERVICE_STATUS } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { AccessTokenService } from '../access-token/access-token.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService,
    private readonly accessTokenService: AccessTokenService) { }


  @Post('uploadImages/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'services', maxCount: 6 },
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
  async uploadImages(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: { services?: Multer.File[] }) {
    return await this.servicesService.uploadImages(files, id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post()
  create(@Body() createServiceDto: CreateServiceDto, @Request() req) {
    return this.servicesService.create(createServiceDto, req.user);
  }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('/publishService/:id')
  async publishService(@Param('id', ParseIntPipe) id: number, @Query('status') status: SERVICE_STATUS, @Request() req) {
    return await this.servicesService.publishService(id, status);
  }

  /**
   * ALL GET REQUEST GOES HERE
   *
   */
  @Get('fetchServiceBySubCategories/:subCategoryId')
  async fetchServiceBySubCategories(@Param('subCategoryId', ParseIntPipe) subCategoryId: number, @Query('filters') filters: any, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset: number, @Request() req) {
    let headers = req.headers
    let tokenData: any = null
    if (headers.authorization) {
      let token = headers.authorization.substring(7)
      tokenData = await this.accessTokenService.findOne({
        where: {
          token
        },
        select: ['tokenData']
      })
      tokenData = { user: tokenData.tokenData }
    } else {
      tokenData = { user: { role: 'GUEST' } }
    }
    if (filters) {
      filters = JSON.parse(filters)
    } else {
      filters = {}
    }
    return await this.servicesService.fetchServiceBySubCategories(subCategoryId, filters, limit, offset, tokenData.user);
  }

  @Get('fetchServiceByCategories/:categoryId')
  async fetchServiceByCategories(@Param('categoryId', ParseIntPipe) categoryId: number, @Query('filters') filters: any, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset: number, @Request() req) {
    let headers = req.headers
    let tokenData: any = null
    if (headers.authorization) {
      let token = headers.authorization.substring(7)
      tokenData = await this.accessTokenService.findOne({
        where: {
          token
        },
        select: ['tokenData']
      })
      tokenData = { user: tokenData.tokenData }
    } else {
      tokenData = { user: { role: 'GUEST' } }
    }
    if (filters) {
      filters = JSON.parse(filters)
    } else {
      filters = {}
    }
    return await this.servicesService.fetchServiceByCategories(categoryId, filters, limit, offset, tokenData.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get()
  findAll(@Query('limit', ParseIntPipe) limit : number, @Query('offset', ParseIntPipe) offset : number, @Request() req) {
    return this.servicesService.findAll(limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('fetchAllServices')
  fetchAllServices(
    @Query('status') status: "ALL" | SERVICE_STATUS,
    @Query('searchString') searchString: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query("orderKey") orderKey: string,
    @Query("orderSeq") orderSeq: 'ASC' | 'DESC',
  ) {
    return this.servicesService.fetchAllServices(status, searchString, startDate, endDate, limit, offset,orderKey,
      orderSeq);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('fetchIndividualServiceAdmin/:id')
  fetchIndividualServiceAdmin(@Param('id') id: string, @Request() req) {
    return this.servicesService.findOne(+id, {});
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.servicesService.findOne(+id, req.headers);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(+id, updateServiceDto);
  }
}
