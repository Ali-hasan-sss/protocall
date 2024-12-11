import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { CompanyUserMappingService } from './company-user-mapping.service';
import { CreateCompanyUserMappingDto } from './dto/create-company-user-mapping.dto';
import { UpdateCompanyUserMappingDto } from './dto/update-company-user-mapping.dto';

@Controller('company-user-mapping')
export class CompanyUserMappingController {
  constructor(private readonly companyUserMappingService: CompanyUserMappingService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchTeamMembers')
  fetchTeamMembers(@Query('subCategoryId', ParseIntPipe) subCategoryId: number, @Request() req) {
    return this.companyUserMappingService.fetchTeamMembers(req.user.appUserId, subCategoryId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchTeamMembersBySlot/:bookingId')
  fetchTeamMembersBySlot(@Query('subCategoryId', ParseIntPipe) subCategoryId: number, @Param('bookingId', ParseIntPipe) bookingId: number, @Request() req) {
    return this.companyUserMappingService.fetchTeamMembersBySlot(req.user.appUserId, subCategoryId, bookingId);
  }
}
