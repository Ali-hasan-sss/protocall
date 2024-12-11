import { Module } from '@nestjs/common'
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_TRANSPORT_HOST'),
          port: configService.get('MAIL_TRANSPORT_PORT'),
          ignoreTLS: true,
          secure: true,
          auth: {
            user: configService.get('MAIL_TRANSPORT_USER'),
            pass: configService.get('MAIL_TRANSPORT_PASSWORD'),
          },
        },
        defaults: {
          from: configService.get('MAIL_TRANSPORT_USER'),
        },
        template: {
          dir: path.resolve(__dirname, '../../', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: false,
          },
        },
      }),
    })
  ],
  controllers: [],
  providers: [
    MailService,
  ],
  exports: [
    MailService,
  ],
})
export class MailModule { }
