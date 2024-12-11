import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { TaxMasterService } from './tax-master.service';
import { CreateTaxMasterDto } from './dto/create-tax-master.dto';
import { UpdateTaxMasterDto } from './dto/update-tax-master.dto';
import { COMMISSIONS_STATUS, TAX_TYPE } from 'src/global/enums';

@Controller('tax-master')
export class TaxMasterController {
  constructor(private readonly taxMasterService: TaxMasterService) { }

  @Post('/createGeneralTax')
  create(@Body() createTaxMasterDto: any) {
    return this.taxMasterService.create({ ...createTaxMasterDto, taxType: TAX_TYPE.GENERAL });
  }

  @Post('/createSpecificTax')
  createSpecificTax(@Body() createTaxMasterDto: any) {
    return this.taxMasterService.create({ ...createTaxMasterDto, taxType: TAX_TYPE.SPECIFIC });
  }

  @Get('/fetchAll')
  fetchAll(@Query('status') status: string) {
    return this.taxMasterService.fetchAll(status);
  }

  @Get()
  findAll(@Query('searchString') searchString: string, @Query('taxType') taxType: string, @Query('status') status: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string, @Query('offset', ParseIntPipe) offset: number, @Query('limit', ParseIntPipe) limit: number) {
    return this.taxMasterService.findAll(searchString, fromDate, toDate, status, taxType, limit, offset);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxMasterService.findOne(+id);
  }


  @Patch('updateGeneralTax/:id')
  updateGeneralTax(@Param('id') id: string, @Body() updateTaxMasterDto: any) {
    return this.taxMasterService.update(+id, { ...updateTaxMasterDto, taxType: TAX_TYPE.GENERAL });
  }

  @Patch('updateSpecificTax/:id')
  updateSpecificTax(@Param('id') id: string, @Body() updateTaxMasterDto: any) {
    return this.taxMasterService.update(+id, { ...updateTaxMasterDto, taxType: TAX_TYPE.SPECIFIC });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxMasterService.remove(+id);
  }
}
