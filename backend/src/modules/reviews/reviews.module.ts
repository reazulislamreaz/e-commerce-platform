import { Module } from '@nestjs/common';
import { CatalogModule } from '@/modules/catalog/catalog.module';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [CatalogModule],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsRepository, ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
