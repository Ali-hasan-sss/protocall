import { Module } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { AccessTokenController } from './access-token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessToken } from './entities/access-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessToken])
  ],
  controllers: [AccessTokenController],
  providers: [AccessTokenService],
  exports: [AccessTokenService]
})
export class AccessTokenModule { }
