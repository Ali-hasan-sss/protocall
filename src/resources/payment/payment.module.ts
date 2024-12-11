import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeModule } from 'nestjs-stripe';
import { UserModule } from '../user/user.module';
import { BookServiceModule } from '../book-service/book-service.module';
import { MilestoneModule } from '../milestone/milestone.module';

@Module({
  imports: [
    StripeModule.forRootAsync({
      useFactory: () => ({
        apiKey: process.env.STRIPE_SECRET,
        apiVersion: '2022-11-15'
      })
    }),
    forwardRef(() => UserModule),
    forwardRef(()=>BookServiceModule),
    forwardRef(()=>MilestoneModule)
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports:[PaymentService]
})
export class PaymentModule {}
