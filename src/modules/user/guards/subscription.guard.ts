import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  GenerationType,
  SUBSCRIPTION_LIMITS,
  SubscriptionPlan,
  UNLIMITED_LIMIT,
} from '../../../common/enums';
import { User, UserRepository } from '../../../repositories';

export const GENERATION_TYPE_KEY = 'generationType';
export const GenerationTypeDecorator = (type: GenerationType): MethodDecorator =>
  SetMetadata(GENERATION_TYPE_KEY, type);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    // Get generation type from decorator
    const generationType = this.reflector.get<GenerationType>(
      GENERATION_TYPE_KEY,
      context.getHandler(),
    );

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if subscription period has expired and reset if needed
    await this.checkAndResetSubscriptionPeriod(user);

    // Get the limit for user's subscription plan and generation type
    const plan = user.subscription?.plan || SubscriptionPlan.FREE;
    const limits = SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS] || {
      workout: SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE].workout,
      meal: SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE].meal,
      inbody: SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE].inbody,
      bodyPhoto: SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE].bodyPhoto,
    };

    let used: number;
    let limit: number;

    if (generationType === GenerationType.WORKOUT) {
      used = user.subscription?.workoutGeneration?.used || 0;
      limit = user.subscription?.workoutGeneration?.limit || limits.workout;
    } else if (generationType === GenerationType.MEAL) {
      used = user.subscription?.mealGeneration?.used || 0;
      limit = user.subscription?.mealGeneration?.limit || limits.meal;
    } else if (generationType === GenerationType.INBODY) {
      used = user.subscription?.inbodyScan?.used || 0;
      limit = user.subscription?.inbodyScan?.limit || limits.inbody;
    } else if (generationType === GenerationType.BODY_PHOTO) {
      used = user.subscription?.bodyPhotoScan?.used || 0;
      limit = user.subscription?.bodyPhotoScan?.limit || limits.bodyPhoto;
    } else {
      // If no type specified, allow (for backward compatibility)
      return true;
    }

    // -1 means unlimited
    if (limit === UNLIMITED_LIMIT) {
      return true;
    }

    // Check if user has exceeded their limit
    if (used >= limit) {
      this.logger.warn(
        `User ${userId} has exceeded ${generationType} AI generation limit: ${used}/${limit}`,
      );
      throw new ForbiddenException(
        `You have reached your monthly limit of ${limit} AI-generated ${generationType} plans. Upgrade your plan for more generations.`,
      );
    }

    this.logger.log(
      `User ${userId} ${generationType} AI generation check passed: ${used}/${limit} used`,
    );

    return true;
  }

  /**
   * Check if subscription period has expired and reset usage counters
   */
  private async checkAndResetSubscriptionPeriod(user: User): Promise<void> {
    const now = new Date();
    const periodStart = new Date(user.subscription?.periodStart || now);

    // Calculate if 30 days have passed
    const daysSincePeriodStart = Math.floor(
      (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePeriodStart >= 30) {
      this.logger.log(
        `Resetting subscription period for user ${user._id}. Last reset: ${periodStart}`,
      );

      // Reset the counters and update period start
      await this.userRepository.update(user._id!.toString(), {
        subscription: {
          ...user.subscription,
          periodStart: now,
          workoutGeneration: {
            ...user.subscription?.workoutGeneration,
            used: 0,
          },
          mealGeneration: {
            ...user.subscription?.mealGeneration,
            used: 0,
          },
          inbodyScan: {
            ...user.subscription?.inbodyScan,
            used: 0,
          },
          bodyPhotoScan: {
            ...user.subscription?.bodyPhotoScan,
            used: 0,
          },
        },
      });

      // Update in-memory object for current request
      if (user.subscription) {
        user.subscription.periodStart = now;
        if (user.subscription.workoutGeneration) {
          user.subscription.workoutGeneration.used = 0;
        }
        if (user.subscription.mealGeneration) {
          user.subscription.mealGeneration.used = 0;
        }
        if (user.subscription.inbodyScan) {
          user.subscription.inbodyScan.used = 0;
        }
        if (user.subscription.bodyPhotoScan) {
          user.subscription.bodyPhotoScan.used = 0;
        }
      }
    }
  }
}
