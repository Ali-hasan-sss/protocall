import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post()
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewService.create(createReviewDto, req.user);
  }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get('fetchReviewByServiceProviderId/:serviceProviderId/:serviceId')
  fetchReviewByServiceProviderId(@Param('serviceProviderId', ParseIntPipe) serviceProviderId: number, @Param('serviceId', ParseIntPipe) serviceId: number, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.reviewService.fetchReviewByServiceProviderId(serviceProviderId, serviceId, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get('fetchReviewByUserId/:userId')
  fetchReviewByUserId(@Param('userId', ParseIntPipe) userId: number, @Query('filterBy', ParseIntPipe) filterBy: number, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.reviewService.fetchReviewByUserId(userId, filterBy, limit, offset, req.user);
  }

  @Get()
  findAll() {
    return this.reviewService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewService.update(+id, updateReviewDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewService.remove(+id);
  }
}
