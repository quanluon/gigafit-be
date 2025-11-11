import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/repositories';
import { User } from 'src/repositories';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create(createUserDto);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
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

