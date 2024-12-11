import { ConflictException, forwardRef, HttpException, HttpStatus, Inject, Injectable, NotAcceptableException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { LOGINTYPE, ROLE, USER_STATUS } from 'src/global/enums';
import { UserService } from 'src/resources/user/user.service';
import { CryptoUtils } from 'src/utils/crypto.utils';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { MoreThanOrEqual, Not } from 'typeorm';
import { AccessTokenService } from 'src/resources/access-token/access-token.service';
import { CompanyUserMappingService } from 'src/resources/company-user-mapping/company-user-mapping.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) private usersService: UserService,
    private configService: ConfigService,
    private accessTokenService: AccessTokenService,
    @Inject(CompanyUserMappingService) private companyUserMappingService: CompanyUserMappingService
  ) { }
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOne({
      where: {
        email: email.toLowerCase(),
        activityStatus: Not(USER_STATUS.DELETED)
      }
    });
    if (user && user.loginType !== LOGINTYPE.PROTOCALL) {
      throw new HttpException('Please login using your linked account', 453);
    }

    if (!user) {
      throw new NotFoundException('Invalid Email')
    }

    let result = CryptoUtils.comparePasswords({
      hashedPassword: user.password,
      salt: user.salt
    }, password);

    if (!result) {
      throw new NotFoundException('Invalid Password')
    }
    if (user && result) {
      const { password, ...result } = user;
      return {
        success: true,
        user: result
      }
    }
    return {
      success: false,
      user: null
    }
  }

  async login(user: any) {
    try {
      const token = crypto
        .randomBytes(48)
        .toString('base64url')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');

      const refreshToken = crypto
        .randomBytes(48)
        .toString('base64url')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');

      let refreshTokenExpiry = moment().add(this.configService.get('REFRESH_TOKEN_EXPIRY'), this.configService.get('REFRESH_TOKEN_EXPIRY_UNIT')).toDate();

      let companyMapping: any = null
      if (user.isTeamMember) {
        companyMapping = await this.companyUserMappingService.findOne({
          where: {
            teamMember: {
              id: user.id,
              activityStatus: Not(USER_STATUS.DELETED)
            }
          },
          relations: ['company']
        })
      }

      let tokenData: any = null;

      // if (user.activityStatus === USER_STATUS.INACTIVE) {
      //   throw new HttpException({
      //     status: HttpStatus.FORBIDDEN,
      //     error: 'User is inactive',
      //   }, HttpStatus.FORBIDDEN)
      // }

      if (user.activityStatus === USER_STATUS.BLACKLIST) {
        throw new HttpException({
          status: HttpStatus.FORBIDDEN,
          message: 'User is blacklisted. Contact Support',
          error: 'User is blacklisted. Contact Support',
        }, HttpStatus.FORBIDDEN)
      }

      if (user.isTeamMember) {
        tokenData = JSON.stringify({
          appUserId: user.id,
          role: user.role,
          isTeamMember: user.isTeamMember,
          companyId: companyMapping.company.id
        })
      } else {
        tokenData = JSON.stringify({
          appUserId: user.id,
          role: user.role,
          isTeamMember: user.isTeamMember
        })
      }
      await this.accessTokenService.create({
        token,
        refreshToken,
        // refreshTokenExpiry: refreshTokenExpiry,
        // tokenExpiry: moment().add(this.configService.get('TOKEN_EXPIRY'), this.configService.get('TOKEN_EXPIRY_UNIT')).toDate(),
        tokenData: tokenData
      })

      return {
        isEmailVerify: user?.isEmailVerify,
        token,
        refreshToken,
        id: user.id,
        role: user.role
      };
    } catch (error) {
      throw error
    }
  }

  async getTokenData(token: string) {
    try {
      // search from database and create an entry into cache
      let accessToken = await this.accessTokenService.findOne({
        where: {
          token: token,
          // tokenExpiry: MoreThanOrEqual(moment().toDate())
        }
      })
      if (!accessToken) {
        throw new UnauthorizedException('Token expired');
      }
      // let tokenData = JSON.parse(accessToken.tokenData)
      // create a cached token
      return JSON.parse(accessToken.tokenData);
    } catch (err) {
      throw err;
    }
  }

  async validateToken(token: string) {
    try {
      // search from database and create an entry into cache
      let accessToken = await this.accessTokenService.findOne({
        where: {
          token: token,
          // tokenExpiry: MoreThanOrEqual(moment().toDate())
        }
      })
      if (!accessToken) {
        throw new UnauthorizedException('Token expired');
      }
      // create a cached token
      let dif = moment().diff(moment(accessToken.tokenExpiry), 'seconds');
      return JSON.parse(accessToken.tokenData);
    } catch (err) {
      throw err;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      let accessToken = await this.accessTokenService.findOne({
        where: {
          refreshToken: refreshToken
        }
      })
      if (!accessToken) throw new UnauthorizedException('Refresh token expired');
      if (moment().isAfter(moment(accessToken.refreshTokenExpiry))) {
        throw new UnauthorizedException('Refresh token expired');
      }
      if (!moment(accessToken.tokenExpiry).isBefore(moment())) {
        throw new ConflictException('Token cannot be refreshed before expiry');
      }
      // generate access token again
      const token = crypto
        .randomBytes(48)
        .toString('base64url')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');

      accessToken.token = token;
      // accessToken.tokenExpiry = moment().add(this.configService.get('TOKEN_EXPIRY'), this.configService.get('TOKEN_EXPIRY_UNIT')).toDate();
      await this.accessTokenService.save(accessToken)
      return {
        token
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async deleteAccount(user: any) {
    try {
      const checkUser = await this.usersService.findOne({
        where: {
          id: user?.appUserId,
          activityStatus: Not(USER_STATUS.DELETED)
        }
      });
      if (!checkUser) {
        return { msg: "Please contact to admin." };
      }
      const userInfo = await this.usersService.update(user?.appUserId, { activityStatus: USER_STATUS.DELETED });
      if (userInfo?.success) {
        return { msg: "Account successfully removed." };
      } else {
        return { msg: "Please contact to admin." };
      }

    } catch (error) {
      throw error
    }
  }

}
