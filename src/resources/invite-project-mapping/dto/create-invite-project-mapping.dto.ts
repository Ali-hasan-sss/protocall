import { IsArray, IsNotEmpty, IsNumber } from "class-validator";

export class CreateInviteProjectMappingDto {

  @IsArray()
  @IsNotEmpty()
  userIds: Array<Number>

  @IsNumber()
  projectId: Number
}
