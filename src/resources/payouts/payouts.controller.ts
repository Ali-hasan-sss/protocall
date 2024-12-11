import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe, ParseEnumPipe } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { PAYOUT_STATUS, ROLE } from 'src/global/enums';
import { Roles } from 'src/validators/role.decorator';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) { }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get()
  findAll(@Query('searchString') searchString: string, @Query('startDate') startDate: Date, @Query('status') status: PAYOUT_STATUS, @Query('endDate') endDate: Date, @Query('limit') limit: number, @Query('offset') offset: number,@Query('orderKey') orderKey: string, @Query('orderSeq') orderSeq: string, @Request() req) {
    return this.payoutsService.findAll(searchString, startDate, endDate, status, limit, offset,orderKey, orderSeq);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch('updateStatus/:id')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: PAYOUT_STATUS, @Request() req) {
    return this.payoutsService.updateStatus(id, status);
  }

  @UseGuards(AuthGuard('bearer'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('/:id')
  getPayoutDetails(@Param('id', ParseIntPipe) id: number,@Request()  req) {
    return this.payoutsService.findById(id);
  }
}
