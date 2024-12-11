import { Controller, Get, Request, Post, UseGuards, Req, Delete, Body, ParseEnumPipe, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { ROLE } from './global/enums';
import { AuthGuard } from '@nestjs/passport';
import { LoginStrategy } from './auth/login.strategy';
import { RolesGuard } from './auth/guards/role.guards';
import { Roles } from './validators/role.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService
  ) { }


  @Get('login/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) { }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req) {
    return this.appService.googleLogin(req)
  }

  @Get('enums')
  async enums(@Request() req) {
    return this.appService.enums();
  }

  @UseGuards(AuthGuard(LoginStrategy.key))
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

}
