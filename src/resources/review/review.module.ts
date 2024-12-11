import { forwardRef, Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { BookServiceModule } from '../book-service/book-service.module';
import { UserModule } from '../user/user.module';
import { BidModule } from '../bid/bid.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), forwardRef(() => BookServiceModule), forwardRef(() => UserModule), forwardRef(() => BidModule)],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService]
})
export class ReviewModule { }
