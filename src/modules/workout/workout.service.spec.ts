import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkoutService } from './workout.service';
import { WorkoutRepository } from '../../repositories';
import { AIService } from '../ai/ai.service';
import { Goal, ExperienceLevel, DayOfWeek } from '../../common/enums';

describe('WorkoutService', () => {
  let service: WorkoutService;
  let repository: WorkoutRepository;
  let aiService: AIService;

  const mockPlan = {
    _id: 'plan-123',
    userId: 'user-123',
    week: 46,
    year: 2025,
    schedule: [
      {
        dayOfWeek: DayOfWeek.MONDAY,
        focus: { en: 'Chest & Triceps', vi: 'Ngực & Tay sau' },
        exercises: [],
      },
    ],
  };

  const mockRepository = {
    create: jest.fn(),
    findCurrentWeekPlan: jest.fn(),
    findByUserAndWeek: jest.fn(),
    update: jest.fn(),
  };

  const mockAIService = {
    generateWorkoutPlan: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutService,
        {
          provide: WorkoutRepository,
          useValue: mockRepository,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    }).compile();

    service = module.get<WorkoutService>(WorkoutService);
    repository = module.get<WorkoutRepository>(WorkoutRepository);
    aiService = module.get<AIService>(AIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentPlan', () => {
    it('should return current week plan', async () => {
      mockRepository.findCurrentWeekPlan.mockResolvedValue(mockPlan);

      const result = await service.getCurrentPlan('user-123');

      expect(result).toEqual(mockPlan);
      expect(repository.findCurrentWeekPlan).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when no plan exists', async () => {
      mockRepository.findCurrentWeekPlan.mockResolvedValue(null);

      await expect(service.getCurrentPlan('user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePlan', () => {
    it('should create new plan when none exists', async () => {
      const generateDto = {
        goal: Goal.MUSCLE_GAIN,
        experienceLevel: ExperienceLevel.BEGINNER,
        scheduleDays: [DayOfWeek.MONDAY],
      };

      mockAIService.generateWorkoutPlan.mockResolvedValue({ schedule: mockPlan.schedule });
      mockRepository.findByUserAndWeek.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockPlan);

      const result = await service.generatePlan('user-123', generateDto);

      expect(result).toEqual(mockPlan);
      expect(aiService.generateWorkoutPlan).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });
  });
});
