import { ConsoleLogger, forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectStripe } from 'nestjs-stripe';
import { UserService } from '../user/user.service';
import * as moment from 'moment';
import { BOOKING_STATUS, ROLE } from 'src/global/enums';
import { BookService } from '../book-service/entities/book-service.entity';
import { BookServiceService } from '../book-service/book-service.service';
import { MilestoneService } from '../milestone/milestone.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectStripe() private readonly stripeClient: Stripe,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => BookServiceService)) private readonly bookService: BookServiceService,
    @Inject(forwardRef(() => MilestoneService)) private readonly milestoneService: MilestoneService
  ) { }
  async createPaymentIntent(amount, description, metadata) {
    try {
      return await this.stripeClient.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
        metadata: metadata,
        automatic_payment_methods: {
          enabled: false
        },
        description: description
      })
    } catch (err) {
      throw err;
    }
  }

  async processPaymentIntent(paymentIntentBody: any) {
    try {
      let pData = paymentIntentBody.data.object;
      if (pData.status === 'succeeded') {
        if (pData.metadata.isService === 'false' && pData.metadata.isMilestone === 'true') {
          /* ------------ MileStone payment done ---------------- */
          if(pData.client_secret){
            await this.milestoneService.mileStonePaymentSucceedAndApproveBidder(pData.client_secret, pData?.metadata?.bidderId || null)
          }
        }
        else if (pData.metadata.isService === 'true' && pData.metadata.isGrandTotal === 'true') {
          // update booking service to completed
          await this.bookService.updateBookStatusCompleted(pData.client_secret)
        }
        else if (pData.metadata.isService === 'true' && pData.metadata.isGrandTotal === 'false') {
          // update booking service to scheduled
          await this.bookService.updateBookStatusScheduled(pData.client_secret)
        }
        else if (pData.metadata.isService === 'false') {
          // await this.milestoneService.updateMileStoneToComplete(pData.client_secret)
        }
      } else {
        if (pData.metadata.isService === 'true' && pData.metadata.isGrandTotal === 'true') {
          // update booking service to completed
          await this.bookService.updateBookStatusPaymentPending(pData.client_secret)
        }
        else if (pData.metadata.isService === 'true' && pData.metadata.isGrandTotal === 'false') {
          // update booking service to scheduled
          await this.bookService.removeBooking(pData.client_secret)
        }
        else if (pData.metadata.isService === 'false') {
          // await this.milestoneService.updateMileStoneNotComplete(pData.client_secret)
        }
      }
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async setupWebHooks(url) {
    try {
      return await this.stripeClient.webhookEndpoints.create({
        url: `${url}/api/payment/success/payment-intent`,
        enabled_events: [
          'payment_intent.succeeded',
          'payment_intent.canceled',
          'payment_intent.payment_failed',
        ]
      })
    } catch (err) {
      throw err;
    }
  }

  async addConnectedAccount(userTokenData) {
    try {
      let user = await this.userService.findOne({
        where: {
          id: userTokenData.appUserId
        }
      })

      if (user.stripeAccountId) {
        throw new HttpException('Stripe Account already exist', 400);
      }

      let stripeAccount = await this.stripeClient.accounts.create({
        type: "standard",
        country: 'US',
        email: user.email,
        business_profile: {
          // support_phone: user.contactNumber,
          name: user.firstName + ' ' + user.lastName,
          product_description: user.headline
        },
        business_type: userTokenData.role === ROLE.SERVICE_PROVIDER ? 'individual' : 'company',
        individual: {
          first_name: user.firstName,
          last_name: user.lastName,
          dob: {
            day: user.dateOfBirth ? parseInt(moment(user.dateOfBirth).format('D')) : parseInt(moment().format('D')),
            year: user.dateOfBirth ? moment(user.dateOfBirth).get('year') : moment().subtract(18, "years").get('year'),
            month: user.dateOfBirth ? parseInt(moment(user.dateOfBirth).format('M')) : moment().get('M'),
          },
          email: user.email,
          // phone: user.contactNumber
        }
      })
      user.stripeAccountId = stripeAccount.id;
      await this.userService.save(user)
      return await this.stripeClient.accountLinks.create({
        account: stripeAccount.id,
        refresh_url: `http://0c06-2a02-6b66-d44e-0-f8d4-bed0-b66a-392a.ngrok.io/api/payment/success?userId=${user.id}`,
        return_url: `http://0c06-2a02-6b66-d44e-0-f8d4-bed0-b66a-392a.ngrok.io/api/payment/error?userId=${user.id}`,
        type: 'account_onboarding'
      })
    } catch (err) {
      throw err;
    }
  }
}
