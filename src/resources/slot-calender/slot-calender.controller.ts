import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SlotCalenderService } from './slot-calender.service';
import { CreateSlotCalenderDto } from './dto/create-slot-calender.dto';
import { UpdateSlotCalenderDto } from './dto/update-slot-calender.dto';

@Controller('slot-calender')
export class SlotCalenderController {
  constructor(private readonly slotCalenderService: SlotCalenderService) {}

  @Post()
  create(@Body() createSlotCalenderDto: CreateSlotCalenderDto) {
    return this.slotCalenderService.create(createSlotCalenderDto);
  }

  @Get()
  findAll() {
    return this.slotCalenderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slotCalenderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSlotCalenderDto: UpdateSlotCalenderDto) {
    return this.slotCalenderService.update(+id, updateSlotCalenderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slotCalenderService.remove(+id);
  }
}
