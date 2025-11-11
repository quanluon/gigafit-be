import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig, redisConfig, awsConfig, jwtConfig, aiConfig } from './config';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { DatabaseModule } from './database/database.module';
import { RepositoryModule } from './repositories/repository.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WorkoutModule } from './modules/workout/workout.module';
import { TrainingModule } from './modules/training/training.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MealModule } from './modules/meal/meal.module';
import { AIModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, awsConfig, jwtConfig, aiConfig],
    }),
    DatabaseModule,
    RepositoryModule,
    HealthModule,
    AuthModule,
    UserModule,
    WorkoutModule,
    TrainingModule,
    AnalyticsModule,
    MealModule,
    AIModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
