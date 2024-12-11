import { Strategy } from 'passport-http-bearer';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class CustomStrategy extends PassportStrategy(Strategy, 'custom') {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email'
        });
    }

    async validate(token): Promise<any> {
        let tokenData: any = {}
        if (token) {
            tokenData = await this.authService.getTokenData(token);
        }
        return tokenData;
    }
}
