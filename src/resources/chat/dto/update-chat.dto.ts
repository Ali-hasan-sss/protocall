import { PartialType } from '@nestjs/mapped-types';
import { QueryChatDto } from './query-chat.dto';

export class UpdateChatDto extends PartialType(QueryChatDto) {}
