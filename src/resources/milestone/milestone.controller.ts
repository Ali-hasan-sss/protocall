import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, ParseIntPipe, UploadedFiles, UseInterceptors, UseGuards,Request, Query } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { Multer } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterField, MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('milestone')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) { }

  /* --------------- NEW API'S For Payment Flow -------------------- */
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('approve-bidder')
  mileStonePaymentSucceedAndApproveBidder(@Query('pin') pin: string,@Query('bidderId') bidderId: number) {
    return this.milestoneService.mileStonePaymentSucceedAndApproveBidder(pin,+bidderId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('approve-milestone-payment-release-request/:milestoneId')
  approveMilestonePaymentRelease(@Param('milestoneId') milestoneId: string) {
    return this.milestoneService.approveMilestonePaymentRelease(+milestoneId);
  } 

  /* --------------- NEW API'S For Payment Flow -------------------- */


  @Post('completeMileStone/:id')
  @Roles(ROLE.CLIENT)
  completeMileStone(@Param('id') id: string) {
    return this.milestoneService.completeMileStone(+id);
  }

  @Post('markMilestonePaymentInProgress/:id')
  @Roles(ROLE.CLIENT)
  markMilestonePaymentInProgress(@Param('id') id: string) {
    return this.milestoneService.markMilestonePaymentInProgress(+id);
  }


  @Post('uploadFiles/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'milestone', maxCount: 6 },
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
  async uploadImages(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: { profPic?: Multer.File[] }) {
    return await this.milestoneService.uploadFiles(id, files);
  }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMilestoneDto: UpdateMilestoneDto, @Request() req) {
    return this.milestoneService.update(+id, updateMilestoneDto, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Delete('removeFile/:id/:fileId')
  delete(@Param('id') id: string, @Param('fileId') fileId: string) {
    return this.milestoneService.deleteFile(+id, +fileId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get(':id')
  fetchMilestoneById(@Param('id') id: string) {
    return this.milestoneService.findById(+id);
  }
}
