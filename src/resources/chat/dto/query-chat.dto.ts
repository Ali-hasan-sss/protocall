import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty } from "class-validator";
import { CHAT_ENTITY_TYPE, CHAT_PROFILE_TYPE } from "src/global/enums";

export class QueryChatDto {
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @IsEnum(CHAT_ENTITY_TYPE, {
    each: true
  })
  type: string;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  typeId: number;

  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @IsEnum(CHAT_PROFILE_TYPE, {
    each: true
  })
  ownerType: string;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  ownerId: number;

  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @IsEnum(CHAT_PROFILE_TYPE, {
    each: true
  })
  userType: string;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  userId: number;
}
