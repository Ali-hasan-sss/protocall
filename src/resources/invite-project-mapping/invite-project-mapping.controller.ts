import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Request, ParseBoolPipe } from '@nestjs/common';
import { InviteProjectMappingService } from './invite-project-mapping.service';
import { CreateInviteProjectMappingDto } from './dto/create-invite-project-mapping.dto';
import { UpdateInviteProjectMappingDto } from './dto/update-invite-project-mapping.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('invite-project-mapping')
export class InviteProjectMappingController {
  constructor(private readonly inviteProjectMappingService: InviteProjectMappingService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Post()
  create(@Body() createInviteProjectMappingDto: CreateInviteProjectMappingDto) {
    return this.inviteProjectMappingService.create(createInviteProjectMappingDto);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY,ROLE.CLIENT)
  @Post('updateClientChatCount/:id')
  updateClientChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number,@Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.inviteProjectMappingService.updateClientChatCount(id, chatCount,sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY,ROLE.CLIENT)
  @Post('updateProviderChatCount/:id')
  updateProviderChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number,@Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.inviteProjectMappingService.updateProviderChatCount(id, chatCount,sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get()
  findAll(@Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset, @Request() req) {
    return this.inviteProjectMappingService.findInvitesByUserId(limit, offset, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inviteProjectMappingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInviteProjectMappingDto: UpdateInviteProjectMappingDto) {
    return this.inviteProjectMappingService.update(+id, updateInviteProjectMappingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inviteProjectMappingService.remove(+id);
  }
}
