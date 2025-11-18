import { DayOfWeek } from '../enums';
import { Translatable } from '../interfaces';

/**
 * Exercise Template Interface
 */
export interface ExerciseTemplate {
  name: Translatable;
  description: Translatable;
  sets: number;
  reps: string;
  videoUrl: string;
}
/**
 * Workout Day Template Interface
 */
export interface WorkoutDayTemplate {
  focus: Translatable;
  exercises: ExerciseTemplate[];
}
/**
 * Default Workout Templates
 * Fallback templates when AI generation fails
 */
export const DEFAULT_WORKOUT_TEMPLATES: Record<DayOfWeek, WorkoutDayTemplate> = {
  [DayOfWeek.MONDAY]: {
    focus: { en: 'Chest & Triceps', vi: 'Ngực & Tay sau' },
    exercises: [
      {
        name: { en: 'Bench Press', vi: 'Đẩy ngực' },
        description: {
          en: 'A compound chest exercise',
          vi: 'Bài tập compound phát triển cơ ngực',
        },
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
      },
      {
        name: { en: 'Incline Dumbbell Press', vi: 'Đẩy tạ đơn dốc' },
        description: {
          en: 'Targets upper chest',
          vi: 'Tập trung vào ngực trên',
        },
        sets: 4,
        reps: '10-12',
        videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
      },
      {
        name: { en: 'Cable Fly', vi: 'Đưa tay cáp' },
        description: {
          en: 'Isolation chest exercise',
          vi: 'Bài tập cô lập ngực',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=Iwe6AmxVf7o',
      },
      {
        name: { en: 'Tricep Dips', vi: 'Chống đẩy xà kép' },
        description: {
          en: 'Compound tricep exercise',
          vi: 'Bài tập compound tay sau',
        },
        sets: 3,
        reps: '10-12',
        videoUrl: 'https://www.youtube.com/watch?v=6kALZikXxLc',
      },
    ],
  },
  [DayOfWeek.TUESDAY]: {
    focus: { en: 'Back & Biceps', vi: 'Lưng & Tay trước' },
    exercises: [
      {
        name: { en: 'Deadlift', vi: 'Nâng tạ đòn' },
        description: {
          en: 'Compound back exercise',
          vi: 'Bài tập compound cho lưng',
        },
        sets: 4,
        reps: '6-8',
        videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
      },
      {
        name: { en: 'Pull-ups', vi: 'Kéo xà' },
        description: {
          en: 'Compound upper body exercise',
          vi: 'Bài tập compound thân trên',
        },
        sets: 4,
        reps: '8-12',
        videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
      },
      {
        name: { en: 'Barbell Row', vi: 'Chèo tạ đòn' },
        description: {
          en: 'Compound back exercise',
          vi: 'Bài tập compound lưng',
        },
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/watch?v=9efgcAjQe7E',
      },
      {
        name: { en: 'Bicep Curls', vi: 'Cuốn tay trước' },
        description: {
          en: 'Isolation bicep exercise',
          vi: 'Bài tập cô lập tay trước',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
      },
    ],
  },
  [DayOfWeek.WEDNESDAY]: {
    focus: { en: 'Legs', vi: 'Chân' },
    exercises: [
      {
        name: { en: 'Squat', vi: 'Squat' },
        description: {
          en: 'Compound leg exercise',
          vi: 'Bài tập compound cho chân',
        },
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
      },
      {
        name: { en: 'Leg Press', vi: 'Đạp chân' },
        description: {
          en: 'Compound leg exercise',
          vi: 'Bài tập compound chân',
        },
        sets: 4,
        reps: '10-12',
        videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
      },
      {
        name: { en: 'Lunges', vi: 'Chùng chân' },
        description: {
          en: 'Single leg exercise',
          vi: 'Bài tập một chân',
        },
        sets: 3,
        reps: '12-15 each leg',
        videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
      },
      {
        name: { en: 'Leg Curl', vi: 'Gập chân' },
        description: {
          en: 'Hamstring isolation',
          vi: 'Bài tập cô lập gân kheo',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
      },
    ],
  },
  [DayOfWeek.THURSDAY]: {
    focus: { en: 'Shoulders', vi: 'Vai' },
    exercises: [
      {
        name: { en: 'Overhead Press', vi: 'Đẩy vai' },
        description: {
          en: 'Shoulder press exercise',
          vi: 'Bài tập đẩy vai',
        },
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
      },
      {
        name: { en: 'Lateral Raise', vi: 'Nâng tạ sang ngang' },
        description: {
          en: 'Side deltoid isolation',
          vi: 'Bài tập cô lập vai giữa',
        },
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
      },
      {
        name: { en: 'Front Raise', vi: 'Nâng tạ trước mặt' },
        description: {
          en: 'Front deltoid isolation',
          vi: 'Bài tập cô lập vai trước',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=SVT4XMvnvJo',
      },
      {
        name: { en: 'Shrugs', vi: 'Nhún vai' },
        description: {
          en: 'Trap exercise',
          vi: 'Bài tập bẫy',
        },
        sets: 3,
        reps: '15-20',
        videoUrl: 'https://www.youtube.com/watch?v=g6qbq4Lf1FI',
      },
    ],
  },
  [DayOfWeek.FRIDAY]: {
    focus: { en: 'Arms', vi: 'Tay' },
    exercises: [
      {
        name: { en: 'Bicep Curls', vi: 'Cuốn tay trước' },
        description: {
          en: 'Isolation bicep exercise',
          vi: 'Bài tập cô lập tay trước',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
      },
      {
        name: { en: 'Hammer Curl', vi: 'Cuốn tạ búa' },
        description: {
          en: 'Bicep and forearm exercise',
          vi: 'Bài tập tay trước và cẳng tay',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4',
      },
      {
        name: { en: 'Tricep Extension', vi: 'Duỗi tay sau' },
        description: {
          en: 'Isolation tricep exercise',
          vi: 'Bài tập cô lập tay sau',
        },
        sets: 3,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/watch?v=YbX7Wd8jQ-Q',
      },
      {
        name: { en: 'Dips', vi: 'Chống đẩy xà kép' },
        description: {
          en: 'Compound tricep exercise',
          vi: 'Bài tập compound tay sau',
        },
        sets: 3,
        reps: '10-12',
        videoUrl: 'https://www.youtube.com/watch?v=6kALZikXxLc',
      },
    ],
  },
  [DayOfWeek.SATURDAY]: {
    focus: { en: 'Full Body', vi: 'Toàn thân' },
    exercises: [
      {
        name: { en: 'Pull-ups', vi: 'Kéo xà' },
        description: {
          en: 'Compound upper body exercise',
          vi: 'Bài tập compound thân trên',
        },
        sets: 4,
        reps: '8-12',
        videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
      },
      {
        name: { en: 'Push-ups', vi: 'Chống đẩy' },
        description: {
          en: 'Compound chest and tricep exercise',
          vi: 'Bài tập compound ngực và tay sau',
        },
        sets: 4,
        reps: '15-20',
        videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
      },
      {
        name: { en: 'Bodyweight Squats', vi: 'Squat trọng lượng cơ thể' },
        description: {
          en: 'Bodyweight leg exercise',
          vi: 'Bài tập chân trọng lượng cơ thể',
        },
        sets: 4,
        reps: '20-25',
        videoUrl: 'https://www.youtube.com/watch?v=aclHkVaku9U',
      },
      {
        name: { en: 'Plank', vi: 'Chống đẩy tĩnh' },
        description: {
          en: 'Core stability exercise',
          vi: 'Bài tập ổn định core',
        },
        sets: 3,
        reps: '30-60 seconds',
        videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
      },
    ],
  },
  [DayOfWeek.SUNDAY]: {
    focus: { en: 'Active Recovery', vi: 'Hồi phục tích cực' },
    exercises: [
      {
        name: { en: 'Light Cardio', vi: 'Cardio nhẹ' },
        description: {
          en: 'Low intensity recovery',
          vi: 'Hồi phục cường độ thấp',
        },
        sets: 1,
        reps: '20-30min',
        videoUrl: 'https://www.youtube.com/watch?v=gC_L9qAHVJ8',
      },
      {
        name: { en: 'Stretching', vi: 'Giãn cơ' },
        description: {
          en: 'Full body stretching',
          vi: 'Giãn cơ toàn thân',
        },
        sets: 1,
        reps: '15-20min',
        videoUrl: 'https://www.youtube.com/watch?v=g_tea8ZNk5A',
      },
      {
        name: { en: 'Yoga', vi: 'Yoga' },
        description: {
          en: 'Flexibility and mobility',
          vi: 'Tính linh hoạt và vận động',
        },
        sets: 1,
        reps: '20-30min',
        videoUrl: 'https://www.youtube.com/watch?v=v7AYKMP6rOE',
      },
      {
        name: { en: 'Foam Rolling', vi: 'Lăn massage' },
        description: {
          en: 'Myofascial release',
          vi: 'Giải phóng cân mạc',
        },
        sets: 1,
        reps: '10-15min',
        videoUrl: 'https://www.youtube.com/watch?v=wAkg0trclFM',
      },
    ],
  },
} as const;
