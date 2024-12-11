import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import * as path from "path";

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService
  ) { }
  async sendResendPasswordOtp(firstName: string, email: string, otp: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'OTP to reset password',
        template: 'otp',
        context: {
          firstName,
          otp
        }
      });
      return true
    } catch (error) {
      console.log(error)
      // this.logger.error(`Error queueing confirmation email to user ${user.email}`)
      return false
    }
  }

  async sendMailForEmailVerification(firstName: string, email: string, otp: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Email Verification(Protocall)',
        template: 'emailVerification',
        context: {
          firstName,
          otp
        }
      });
      return true
    } catch (error) {
      console.log("Email Error: ", error)
      return false
    }
  }

  async sendMailForProfileStatus(firstName: string, email: string, status: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Account status(Protocall)',
        template: 'accountStatus',
        context: {
          firstName,
          status
        }
      });
      return true
    } catch (error) {
      console.log(error)
      // this.logger.error(`Error queueing confirmation email to user ${user.email}`)
      return false
    }
  }
}
