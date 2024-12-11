import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseEnumPipe, ParseIntPipe, UseGuards, ParseFloatPipe, HttpException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { CATEGORY_ASSOCIATE, CATEGORY_STATUS, ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { CategoryMasterService } from './category-master.service';
import { CreateCategoryMasterDto } from './dto/create-category_master.dto';
import { UpdateCategoryMasterDto } from './dto/update-category_master.dto';
import { Multer } from 'multer';

@Controller('category-master')
export class CategoryMasterController {
  constructor(private readonly categoryMasterService: CategoryMasterService) { }

  @Post('upload/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 6 },
  ] as Array<MulterField>, {
    limits: {
      fileSize: 1024 * 1024 * 6,
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
  async uploadImages(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: { image?: Multer.File[] }) {
    return await this.categoryMasterService.uploadImage(files, id);
  }
  
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  create(@Body() createCategoryMasterDto: CreateCategoryMasterDto) {
    return this.categoryMasterService.create(createCategoryMasterDto);
  }


  @Get('categoriesByNatureOfWork')
  categoriesByNatureOfWork(@Query('natureOfWork') natureOfWork: CATEGORY_ASSOCIATE) {
    return this.categoryMasterService.fetchCategoriesByNatureOfWork(natureOfWork);
  }

  @Get('trendingCategory')
  fetchTrendingCategory(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.categoryMasterService.fetchTrendingCategory(startDate, endDate);
  }

  @Get('fetchCategoriesByDistance')
  fetchCategoriesByDistance(@Query('lng', ParseFloatPipe) lng: number, @Query('lat', ParseFloatPipe) lat: number, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset: number) {
    return this.categoryMasterService.fetchCategoriesByDistance(lat, lng, limit, offset);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get()
  findAll(@Query('limit', ParseIntPipe) limit, @Query('searchString') searchString: string, @Query('offset', ParseIntPipe) offset, @Query('status') status: CATEGORY_STATUS) {
    return this.categoryMasterService.findAll(status, searchString, limit, offset);
  }

  @Get('fetchMultiple')
  findMany(@Query('ids') ids: Array<number>) {
    return this.categoryMasterService.findMany(ids);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('findOneAdmin/:id')
  async findOneAdmin(@Param('id') id: string) {
    return await this.categoryMasterService.findOne(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryMasterService.findOne(+id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryMasterDto: UpdateCategoryMasterDto) {
    return this.categoryMasterService.update(+id, updateCategoryMasterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryMasterService.remove(+id);
  }
}
