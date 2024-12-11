import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ValidationPipe
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/auth/guards/role.guards";
import { ROLE } from "src/global/enums";
import { Roles } from "src/validators/role.decorator";
import { ChatService } from "./chat.service";
import { QueryChatDto } from "./dto/query-chat.dto";
import { UpdateChatDto } from "./dto/update-chat.dto";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard("bearer"), RolesGuard)
  @Roles(
    ROLE.SERVICE_PROVIDER,
    ROLE.SERVICE_PROVIDER_COMPANY,
    ROLE.CLIENT,
    ROLE.ADMIN
  )
  @Get("/getInfo")
  findOne(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true
      })
    )
    query: QueryChatDto
  ) {
    return this.chatService.findOne(query);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(+id, updateChatDto);
  }
}
