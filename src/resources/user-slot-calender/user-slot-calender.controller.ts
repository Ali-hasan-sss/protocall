import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseIntPipe, ParseArrayPipe } from '@nestjs/common';
import { UserSlotCalenderService } from './user-slot-calender.service';
import { CreateUserSlotCalenderDto } from './dto/create-user-slot-calender.dto';
import { UpdateUserSlotCalenderDto } from './dto/update-user-slot-calender.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('user-slot-calender')
export class UserSlotCalenderController {
  constructor(private readonly userSlotCalenderService: UserSlotCalenderService) { }

  @Post()
  create(@Body() createUserSlotCalenderDto: CreateUserSlotCalenderDto) {
    return this.userSlotCalenderService.create(createUserSlotCalenderDto);
  }

  // @Get()
  // findAll() {
  //   return this.userSlotCalenderService.findAll();
  // }

  //@TODO develop custom date parser
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Get('/getAvailableSlots/:serviceProviderId')
  availableSlots(@Param('serviceProviderId', ParseIntPipe) serviceProviderId: number, @Query('startDate') startDate, @Query('endDate') endDate, @Request() req) {
    return this.userSlotCalenderService.availableSlots(startDate, endDate, serviceProviderId)
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY, ROLE.SERVICE_PROVIDER, ROLE.CLIENT)
  @Get('/getAvailableSlotsByCategoryId/:serviceProviderId')
  getAvailableSlotsByCategoryId(@Param('serviceProviderId', ParseIntPipe) serviceProviderId: number, @Query('categoryIds', ParseArrayPipe) categoryIds: Array<String>, @Query('startDate') startDate, @Query('endDate') endDate, @Request() req) {
    return this.userSlotCalenderService.getAvailableSlotsByCategoryId(categoryIds, startDate, endDate, serviceProviderId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userSlotCalenderService.findOne(+id);
  }

  @Patch('updateSlotAvailability/:serviceProviderId')
  updateSlotAvailability(@Param('serviceProviderId', ParseIntPipe) serviceProviderId: number, @Body() slots: any) {
    return this.userSlotCalenderService.updateSlotAvailability(serviceProviderId, slots);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserSlotCalenderDto: UpdateUserSlotCalenderDto) {
    return this.userSlotCalenderService.update(+id, updateUserSlotCalenderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userSlotCalenderService.remove(+id);
  }
}
