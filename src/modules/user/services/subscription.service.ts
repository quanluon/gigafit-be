import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../repositories';
import { SUBSCRIPTION_LIMITS, SubscriptionPlan, GenerationType } from '../../../common/enums';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Increment AI generation usage for a user by type
   */
  async incrementAIGenerationUsage(userId: string, type: GenerationType): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.error(`User ${userId} not found when incrementing AI generation usage`);
      return;
    }

    if (type === GenerationType.WORKOUT) {
      const newUsage = (user.subscription?.workoutGeneration?.used || 0) + 1;
      await this.userRepository.update(userId, {
        subscription: {
          ...user.subscription,
          workoutGeneration: {
            ...user.subscription?.workoutGeneration,
            used: newUsage,
          },
        },
      });
      this.logger.log(`Incremented workout AI generation usage for user ${userId}: ${newUsage}`);
    } else if (type === GenerationType.MEAL) {
      const newUsage = (user.subscription?.mealGeneration?.used || 0) + 1;
      await this.userRepository.update(userId, {
        subscription: {
          ...user.subscription,
          mealGeneration: {
            ...user.subscription?.mealGeneration,
            used: newUsage,
          },
        },
      });
      this.logger.log(`Incremented meal AI generation usage for user ${userId}: ${newUsage}`);
    }
  }

  /**
   * Get user's remaining AI generations by type
   */
  async getRemainingGenerations(
    userId: string,
    type: GenerationType,
  ): Promise<{
    used: number;
    limit: number;
    remaining: number;
    plan: string;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = user.subscription?.plan || SubscriptionPlan.FREE;
    const limits = SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS] || {
      workout: 3,
      meal: 3,
    };

    let used: number;
    let limit: number;

    if (type === GenerationType.WORKOUT) {
      used = user.subscription?.workoutGeneration?.used || 0;
      limit = user.subscription?.workoutGeneration?.limit || limits.workout;
    } else {
      used = user.subscription?.mealGeneration?.used || 0;
      limit = user.subscription?.mealGeneration?.limit || limits.meal;
    }

    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      plan,
    };
  }

  /**
   * Check if user has available AI generations for a specific type
   */
  async hasAvailableGenerations(userId: string, type: GenerationType): Promise<boolean> {
    const { remaining, limit } = await this.getRemainingGenerations(userId, type);
    return limit === -1 || remaining > 0;
  }

  /**
   * Get all generation stats for a user
   */
  async getAllGenerationStats(userId: string): Promise<{
    plan: string;
    periodStart: Date;
    workout: { used: number; limit: number; remaining: number };
    meal: { used: number; limit: number; remaining: number };
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const workoutStats = await this.getRemainingGenerations(userId, GenerationType.WORKOUT);
    const mealStats = await this.getRemainingGenerations(userId, GenerationType.MEAL);

    return {
      plan: user.subscription?.plan || SubscriptionPlan.FREE,
      periodStart: user.subscription?.periodStart || new Date(),
      workout: {
        used: workoutStats.used,
        limit: workoutStats.limit,
        remaining: workoutStats.remaining,
      },
      meal: {
        used: mealStats.used,
        limit: mealStats.limit,
        remaining: mealStats.remaining,
      },
    };
  }

  /**
   * Upgrade user's subscription plan
   */
  async upgradeSubscription(userId: string, plan: SubscriptionPlan): Promise<void> {
    const limits = SUBSCRIPTION_LIMITS[plan];
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, {
      subscription: {
        ...user.subscription,
        plan,
        workoutGeneration: {
          ...user.subscription?.workoutGeneration,
          limit: limits.workout,
        },
        mealGeneration: {
          ...user.subscription?.mealGeneration,
          limit: limits.meal,
        },
      },
    });

    this.logger.log(
      `Upgraded user ${userId} to ${plan} plan with ${limits.workout} workout & ${limits.meal} meal generations/month`,
    );
  }

  /**
   * Reset subscription period for a user (admin use)
   */
  async resetSubscriptionPeriod(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, {
      subscription: {
        ...user.subscription,
        periodStart: new Date(),
        workoutGeneration: {
          ...user.subscription?.workoutGeneration,
          used: 0,
        },
        mealGeneration: {
          ...user.subscription?.mealGeneration,
          used: 0,
        },
      },
    });

    this.logger.log(`Reset subscription period for user ${userId}`);
  }
}
