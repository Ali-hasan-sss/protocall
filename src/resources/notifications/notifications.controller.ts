import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.ADMIN)
  @Get()
  findAll(
    @Query('limit', ParseIntPipe) limit: number, 
    @Query('offset', ParseIntPipe) offset: number, 
    @Request() req,
    @Query('onlyUnread', ParseBoolPipe) onlyUnread: boolean = false
    ) {
    return this.notificationsService.findAll(limit, offset, onlyUnread, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.ADMIN)
  @Get('getById/:id')
  findOneById(@Param('id', ParseIntPipe) id: number, @Request() req){
    return this.notificationsService.findOneById(id, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.ADMIN)
  @Patch('updateRead/:id')
  updateRead(@Param('id', ParseIntPipe) id: string, @Request() req) {
    return this.notificationsService.updateRead(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
