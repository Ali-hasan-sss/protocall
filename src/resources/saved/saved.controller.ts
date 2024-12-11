import { Controller, Get, Post, Body, Patch, Param, Request, Delete, ParseIntPipe, ClassSerializerInterceptor, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { SavedService } from './saved.service';
import { CreateSavedDto } from './dto/create-saved.dto';
import { UpdateSavedDto } from './dto/update-saved.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('saved')
export class SavedController {
  constructor(private readonly savedService: SavedService) { }


  @Post()
  create(@Body() createSavedDto: CreateSavedDto) {
    return this.savedService.create(createSavedDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Post('saveService')
  saveService(@Body('serviceId', ParseIntPipe) serviceId: number, @Request() req) {
    return this.savedService.saveService(serviceId, req.user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('saveProject')
  saveProject(@Body('projectId', ParseIntPipe) projectId: number, @Request() req) {
    return this.savedService.saveProject(projectId, req.user);
  }

  @Get()
  findAll() {
    return this.savedService.findAll();
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchSavedProjects')
  fetchSavedProjects(@Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.savedService.fetchSavedProjects(limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchSavedServices')
  fetchSavedServices(@Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.savedService.fetchSavedServices(limit, offset, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSavedDto: UpdateSavedDto) {
    return this.savedService.update(+id, updateSavedDto);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.savedService.remove(+id);
  }
}
