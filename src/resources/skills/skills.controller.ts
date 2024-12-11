import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE, COMMISSIONS_STATUS } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  create(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.create(createSkillDto);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get()
  findAll(@Query('limit', ParseIntPipe) limit: number,@Query('searchString') searchString: string, @Query('offset', ParseIntPipe) offset: number, @Query('status') status: "ALL"| COMMISSIONS_STATUS ) {
    return this.skillsService.findAll(status,searchString,limit, offset);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.skillsService.findOne(+id);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
    return this.skillsService.update(+id, updateSkillDto);
  }

  // @UseGuards(AuthGuard('bearer'), RolesGuard)
  // @Roles(ROLE.ADMIN)
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.skillsService.remove(+id);
  // }
}
