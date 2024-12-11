import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseFloatPipe,
  HttpException,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { SubCategoryService } from "./sub-category.service";
import { CreateSubCategoryDto } from "./dto/create-sub-category.dto";
import { UpdateSubCategoryDto } from "./dto/update-sub-category.dto";
import { COMMISSIONS_STATUS } from "src/global/enums";
import { Multer } from "multer";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  MulterField,
  MulterOptions,
} from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
// import { Query } from 'typeorm/driver/Query';

@Controller("sub-category")
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoryService.create(createSubCategoryDto);
  }

  @Get()
  findAll(
    @Query("limit", ParseIntPipe) limit: number,
    @Query("searchString") searchString: string,
    @Query("offset", ParseIntPipe) offset: number,
    @Query("status") status: "ALL" | COMMISSIONS_STATUS
  ) {
    return this.subCategoryService.findAll(status, searchString, limit, offset);
  }

  @Get("fetchSubcategoriesByDistance")
  fetchSubcategoriesByDistance(
    @Query("lng", ParseFloatPipe) lng: number,
    @Query("lat", ParseFloatPipe) lat: number,
    @Query("limit", ParseIntPipe) limit: number,
    @Query("offset", ParseIntPipe) offset: number
  ) {
    return this.subCategoryService.fetchSubcategoriesByDistance(
      lat,
      lng,
      limit,
      offset
    );
  }

  @Post("upload/:id")
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: "image", maxCount: 6 }] as Array<MulterField>,
      {
        limits: {
          fileSize: 1024 * 1024 * 6,
          files: 6,
        },
        fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
            return cb(
              new HttpException(
                {
                  status: 400,
                  error: `Only image files are allowed`,
                },
                400
              ),
              false
            );
          }
          return cb(null, true);
        },
      } as MulterOptions
    )
  )
  async uploadImages(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() files: { image?: Multer.File[] }
  ) {
    return await this.subCategoryService.uploadImage(files, id);
  }

  @Get("search")
  search(@Query("keyword") search: string, @Query("type") type: string) {
    return this.subCategoryService.search(search, type);
  }

  @Get("getTrendingSubCategories")
  getTrendingSubCategories() {
    return this.subCategoryService.getTrendingSubCategories();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.subCategoryService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto
  ) {
    return this.subCategoryService.update(+id, updateSubCategoryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.subCategoryService.remove(+id);
  }
}
