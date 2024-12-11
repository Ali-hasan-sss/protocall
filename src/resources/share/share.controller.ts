import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe
} from "@nestjs/common";
import { ShareService } from "./share.service";

@Controller("share")
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get("/getData/:id")
  async getData(@Param("id") id: string) {
    return await this.shareService.getData(id);
  }

  @Get("/shareId")
  async create(
    @Query("entityType") entityType: string,
    @Query("id", ParseIntPipe) id: number
  ) {
    return await this.shareService.create(entityType, id);
  }

  @Post()
  post() {
    return this.shareService.notAvailableOperation();
  }

  @Patch()
  update() {
    return this.shareService.notAvailableOperation();
  }

  @Delete()
  remove() {
    return this.shareService.notAvailableOperation();
  }
}
