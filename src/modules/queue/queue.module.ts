import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkoutGenerationProcessor } from './processors/workout-generation.processor';
import { MealGenerationProcessor } from './processors/meal-generation.processor';
import { QueueService } from './queue.service';
import { QueueName } from '../../common/enums';
import { WorkoutModule } from '../workout/workout.module';
import { MealModule } from '../meal/meal.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: QueueName.WORKOUT_GENERATION,
      },
      {
        name: QueueName.MEAL_GENERATION,
      },
    ),
    forwardRef(() => WorkoutModule),
    forwardRef(() => MealModule),
    NotificationModule,
    UserModule,
  ],
  providers: [WorkoutGenerationProcessor, MealGenerationProcessor, QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
