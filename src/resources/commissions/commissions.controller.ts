import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { COMMISSIONS_STATUS, ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  create(@Body() createCommissionDto: CreateCommissionDto) {
    return this.commissionsService.create(createCommissionDto);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get()
  findAll(@Query('limit', ParseIntPipe) limit: number, @Query('searchString') searchString: string, @Query('offset', ParseIntPipe) offset: number, @Query('status') status: "ALL" | COMMISSIONS_STATUS) {
    return this.commissionsService.findAll(status, searchString, limit, offset);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.commissionsService.findOne(+id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommissionDto: UpdateCommissionDto) {
    return this.commissionsService.update(+id, updateCommissionDto);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commissionsService.remove(+id);
  }
}
