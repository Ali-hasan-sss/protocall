import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';

@Module({
  imports:[TypeOrmModule.forFeature([User])],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
