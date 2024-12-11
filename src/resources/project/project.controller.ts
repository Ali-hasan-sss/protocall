import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query, ParseArrayPipe, ParseBoolPipe } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { BOOKING_STATUS, PROJECT_STATUS, ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { SubCategory } from '../sub-category/entities/sub-category.entity';
import { FilterProjectDto } from './dto/filter-project.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectService.create(createProjectDto, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('updateProjectStatus/:id')
  updateProjectStatus(@Param('id', ParseIntPipe) id: number, @Body() updateStatusBody: any, @Request() req) {
    return this.projectService.updateProjectStatus(id, updateStatusBody, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('updateClientChatCount/:id')
  updateClientChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.projectService.updateClientChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('updateProviderChatCount/:id')
  updateProviderChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.projectService.updateProviderChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('findAllByStatus')
  findAllByStatus(@Query('status', ParseArrayPipe) status: Array<PROJECT_STATUS>, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.projectService.findAllByStatus(status, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('fetchAllProjects')
  fetchAllProjects(
    @Query('status') status: "ALL" | PROJECT_STATUS,
    @Query('searchString') searchString: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query("orderKey") orderKey: string,
    @Query("orderSeq") orderSeq: 'ASC' | 'DESC',
    @Request() req
  ) {
    return this.projectService.fetchAllProjects(status, searchString, startDate, endDate, limit, offset, orderKey, orderSeq);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchProjectForClientByDate')
  fetchProjectForClientByDate(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.projectService.fetchProjectForClientByDate(startDate, endDate, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchPastProjects')
  fetchPastProjects(@Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.projectService.fetchPastProjects(limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchProjectByDate')
  fetchProjectByDate(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.projectService.fetchProjectByDate(startDate, endDate, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('findProjectsBySubCategories')
  findProjectsBySubCategories(@Query('subCategories', ParseArrayPipe) subCategories: Array<number>, @Query('limit') limit: number, @Query('offset') offset: number, @Query('filters') filters: any, @Request() req) {
    return this.projectService.findProjectsBySubCategories(subCategories, limit, offset, JSON.parse(filters), req.user);
  }

  @Get('searchProjectSubCategories')
  search(@Query('keyword') search: string) {
    return this.projectService.searchProjectSubCategories(search);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('fetchProjectAdmin/:id')
  fetchProjectAdmin(@Param('id') id: string, @Request() req) {
    return this.projectService.fetchProjectAdmin(+id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get(':id')
  findById(@Param('id') id: string, @Request() req) {
    return this.projectService.findById(+id, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(+id, updateProjectDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.remove(+id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('milestone-payment-intent/:id')
  createPaymentIntentForMileStone(@Param('id') id: string, @Query('bidderId') bidderId: string) {
    return this.projectService.createPaymentIntentForMileStone(+id, +bidderId);
  }
}
