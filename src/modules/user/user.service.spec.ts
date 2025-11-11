import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '@/repositories';
import { Goal, ExperienceLevel, DayOfWeek } from '@/common/enums';
import { User } from '@/repositories';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  const mockUser = {
    _id: '123',
    email: 'test@example.com',
    cognitoSub: 'cognito-123',
    goal: Goal.MUSCLE_GAIN,
    experienceLevel: ExperienceLevel.BEGINNER,
    height: 175,
    weight: 70,
    targetWeight: 75,
    scheduleDays: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
  } as User;

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByCognitoSub: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('123');

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', async () => {
      const result = await service.isProfileComplete(mockUser);

      expect(result).toBe(true);
    });

    it('should return false for incomplete profile', async () => {
      const incompleteUser = { ...mockUser, goal: undefined } as User;

      const result = await service.isProfileComplete(incompleteUser);

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = { weight: 72 };
      const updatedUser = { ...mockUser, weight: 72 } as User;
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update('123', updateData);

      expect(result).toEqual(updatedUser);
      expect(repository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(service.update('999', { weight: 72 })).rejects.toThrow(NotFoundException);
    });
  });
});
