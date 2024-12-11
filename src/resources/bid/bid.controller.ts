import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query, ParseBoolPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';

@Controller('bid')
export class BidController {
  constructor(private readonly bidService: BidService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post()
  create(@Body() createBidDto: CreateBidDto, @Request() req) {
    return this.bidService.create(createBidDto, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY,ROLE.CLIENT)
  @Post('updateClientChatCount/:id')
  updateClientChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number,@Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.bidService.updateClientChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY,ROLE.CLIENT)
  @Post('updateProviderChatCount/:id')
  updateProviderChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number,@Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.bidService.updateProviderChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('assignTeamMember/:userId/:id')
  assignTeamMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number, @Request() req) {
    return this.bidService.assignTeamMember(id, userId, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get()
  findByUserId(@Query('isApproved', ParseBoolPipe) isApproved: Boolean,@Query('isShortlisted', ParseBoolPipe) isShortlisted: Boolean, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset, @Request() req) {
    return this.bidService.findByUserId(isApproved, isShortlisted, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get("user/findBidsByUserId")
  findBidsByUserId(@Query('onlyShortListed', ParseBoolPipe) onlyShortListed: Boolean, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset, @Request() req) {
    return this.bidService.findBidsByUserId(onlyShortListed, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT,ROLE.SERVICE_PROVIDER,ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchByProjectId/:projectId')
  fetchByProjectId(@Param('projectId', ParseIntPipe) projectId: number,@Query('isShortlisted', ParseBoolPipe) isShortlisted: Boolean, @Query('limit', ParseIntPipe) limit: number, @Query('offset', ParseIntPipe) offset, @Request() req) {
    return this.bidService.fetchByProjectId(projectId, isShortlisted, limit, offset, req.user);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bidService.findById(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBidDto: UpdateBidDto) {
    return this.bidService.update(+id, updateBidDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return await this.bidService.remove(+id);
  }
}
