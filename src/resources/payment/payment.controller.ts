import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {
  }

  @Post('addConnectedAccount')
  addConnectedAccount(@Request() req: any) {
    return this.paymentService.addConnectedAccount(req.user)
  }

  @Get('success')
  success(@Request() req) {
    return this.paymentService.processPaymentIntent(req.body);
  }

  @Post('success/payment-intent')
  successPaymentIntent(@Request() req) {
    return this.paymentService.processPaymentIntent(req.body);
  }

  @Get('error')
  error(@Request() req) {
    return this.paymentService.processPaymentIntent(req.body);
  }
}
