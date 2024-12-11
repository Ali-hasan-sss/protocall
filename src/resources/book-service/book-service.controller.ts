import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query, NotFoundException, ParseBoolPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { BOOKING_STATUS, ROLE, SERVICE_STATUS } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';
import { BookServiceService } from './book-service.service';
import { CreateBookServiceDto } from './dto/create-book-service.dto';
import { UpdateBookServiceDto } from './dto/update-book-service.dto';

@Controller('book-service')
export class BookServiceController {
  constructor(private readonly bookServiceService: BookServiceService) { }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('/rescheduleBooking/:id')
  async rescheduleBooking(@Param('id', ParseIntPipe) bookingId: number, @Body() rescheduleBookDto: any, @Request() req) {
    return await this.bookServiceService.rescheduleBooking(bookingId, rescheduleBookDto.slotRef);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT, ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('/cancelBooking/:id')
  async cancelBooking(@Param('id', ParseIntPipe) bookingId: number, @Request() req) {
    return await this.bookServiceService.cancelBooking(bookingId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('/raiseInvoice/:id')
  async raiseInvoice(@Param('id', ParseIntPipe) bookingId, @Request() req) {
    return await this.bookServiceService.raiseInvoice(bookingId);
  }
  
  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('/removeBookingById/:id')
  async removeBookingById(@Param('id', ParseIntPipe) bookingId, @Request() req) {
    return await this.bookServiceService.removeBookingById(bookingId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('updateClientChatCount/:id')
  updateClientChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.bookServiceService.updateClientChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY, ROLE.CLIENT)
  @Post('updateProviderChatCount/:id')
  updateProviderChatCount(@Param('id', ParseIntPipe) id: number, @Body('chatCount', ParseIntPipe) chatCount: number, @Body('sendNotification', ParseBoolPipe) sendNotification: Boolean, @Request() req) {
    return this.bookServiceService.updateProviderChatCount(id, chatCount, sendNotification);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Post('/completeBooking/:id')
  async completeBooking(@Param('id', ParseIntPipe) bookingId, @Request() req) {
    return await this.bookServiceService.completeBooking(bookingId);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Post()
  async create(@Body() createBookServiceDto: CreateBookServiceDto, @Request() req) {
    return await this.bookServiceService.create(createBookServiceDto, req.user);
  }

  @Get()
  findAll(@Query('options') options: string) {
    return this.bookServiceService.findAll(JSON.parse(options));
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchBookedServicesByDate')
  fetchBookedServicesByDate(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.bookServiceService.fetchBookedServicesByDate(startDate, endDate, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchBookedServices')
  fetchBookedServices(@Query('status') status: BOOKING_STATUS, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.bookServiceService.fetchBookedServices(status, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('fetchAllBookedService')
  fetchAllBookedService(
    @Query('status') status: "ALL" | BOOKING_STATUS,
    @Query('searchString') searchString: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query("orderKey") orderKey: string,
    @Query("orderSeq") orderSeq: 'ASC' | 'DESC'
  ) {
    return this.bookServiceService.fetchAllBookedService(status, searchString, startDate, endDate, limit, offset,orderKey,
      orderSeq);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Get('fetchBookedServiceById/:id')
  fetchBookedServiceById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.bookServiceService.fetchBookedServiceById(id, req.user);
  }


  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchBookedServicesForClient')
  fetchBookedServicesForClient(@Query('status') status: BOOKING_STATUS, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.bookServiceService.fetchBookedServicesForClient(status, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchServicesForClientByDate')
  fetchServicesForClientByDate(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('limit') limit: number, @Query('offset') offset: number, @Request() req) {
    return this.bookServiceService.fetchServicesForClientByDate(startDate, endDate, limit, offset, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchBookedServicesByIdForClient/:id')
  async fetchBookedServicesByIdForClient(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.bookServiceService.fetchBookedServicesByIdForClient(id, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.CLIENT)
  @Get('fetchBooking/:uoid')
  async fetchBooking(@Param('uoid') uoid: string, @Request() req) {
    let { id } = await this.bookServiceService.fetchBookingByUID(uoid, req.user);
    if (!id) {
      throw new NotFoundException('Booking not found.')
    }
    return await this.bookServiceService.fetchBookedServicesByIdForClient(id, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('assignTeamMember/:userId/:id')
  async assignTeamMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number, @Request() req) {
    return await this.bookServiceService.assignTeamMember(id, userId, req.user);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.SERVICE_PROVIDER, ROLE.SERVICE_PROVIDER_COMPANY)
  @Post('sendReminder/:id')
  async sendReminder(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.bookServiceService.sendReminder(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookServiceDto: UpdateBookServiceDto) {
    return await this.bookServiceService.update(+id, updateBookServiceDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.bookServiceService.remove(+id);
  }
}
