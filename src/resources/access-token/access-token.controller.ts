import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { UpdateAccessTokenDto } from './dto/update-access-token.dto';

@Controller('access-token')
export class AccessTokenController {
  constructor(private readonly accessTokenService: AccessTokenService) {}
}
