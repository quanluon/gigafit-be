import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories';
import { User } from '../../repositories';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SUBSCRIPTION_LIMITS, SubscriptionPlan } from 'src/common';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const isBeta = process.env.BETA === 'true';
    const subscription = {
      plan: isBeta ? SubscriptionPlan.PREMIUM : SubscriptionPlan.FREE,
      periodStart: new Date(),
      workoutGeneration: { used: 0 },
      mealGeneration: { used: 0 },
      inbodyScan: { used: 0 },
      bodyPhotoScan: { used: 0 },
    };
    return this.userRepository.create({ ...createUserDto, subscription });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id, { lean: true });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.subscription) {
      const subscription = {
        plan: SubscriptionPlan.FREE,
        periodStart: new Date(),
        workoutGeneration: { used: 0 },
        mealGeneration: { used: 0 },
        inbodyScan: { used: 0 },
        bodyPhotoScan: { used: 0 },
      };
      await this.userRepository.update(id, { subscription });
      user.subscription = subscription;
    }

    const plan = user.subscription?.plan || SubscriptionPlan.FREE;

    user.subscription.workoutGeneration.limit = SUBSCRIPTION_LIMITS[plan].workout;
    user.subscription.mealGeneration.limit = SUBSCRIPTION_LIMITS[plan].meal;
    if (user.subscription.inbodyScan) {
      user.subscription.inbodyScan.limit = SUBSCRIPTION_LIMITS[plan].inbody;
    }
    if (user.subscription.bodyPhotoScan) {
      user.subscription.bodyPhotoScan.limit = SUBSCRIPTION_LIMITS[plan].bodyPhoto;
    } else {
      user.subscription.bodyPhotoScan = {
        used: 0,
        limit: SUBSCRIPTION_LIMITS[plan].bodyPhoto,
      };
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByCognitoSub(cognitoSub: string): Promise<User | null> {
    return this.userRepository.findByCognitoSub(cognitoSub);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async delete(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async isProfileComplete(user: User): Promise<boolean> {
    return !!(
      user.goal &&
      user.experienceLevel &&
      user.height &&
      user.weight &&
      user.scheduleDays &&
      user.scheduleDays.length > 0
    );
  }
}
