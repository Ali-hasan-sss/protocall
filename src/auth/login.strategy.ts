import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ROLE } from 'src/global/enums';
import { AuthService } from './auth.service';

@Injectable()
export class LoginStrategy extends PassportStrategy(Strategy, 'login') {
  static key = "login"
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email'
    });
  }
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user.success) {
      throw new UnauthorizedException();
    }
    return user.user;
  }
}
