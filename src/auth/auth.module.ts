import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from 'src/resources/user/user.module';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { AccessTokenModule } from 'src/resources/access-token/access-token.module';
import { BearerStrategy } from './bearer.strategy';
import { LoginStrategy } from './login.strategy';
import { CompanyUserMappingModule } from 'src/resources/company-user-mapping/company-user-mapping.module';
import { CustomStrategy } from './custom.strategy';

@Module({
  imports: [forwardRef(() => UserModule), PassportModule, AccessTokenModule, CompanyUserMappingModule],
  providers: [AuthService, LoginStrategy, AccessTokenModule, BearerStrategy, CustomStrategy],
  exports: [AuthService]
})
export class AuthModule { }
