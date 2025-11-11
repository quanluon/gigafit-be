/**
 * Exercise Video Database
 * Curated collection of verified YouTube instructional videos
 */

interface ExerciseVideo {
  keywords: string[];
  videoUrl: string;
  source: string;
}

export class ExerciseVideoDatabase {
  private static videos: ExerciseVideo[] = [
    // CHEST EXERCISES
    {
      keywords: ['bench press', 'barbell bench', 'flat bench', 'đẩy ngực', 'bench'],
      videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
      source: 'AthleanX',
    },
    {
      keywords: [
        'incline bench',
        'incline press',
        'incline dumbbell',
        'đẩy tạ đơn dốc',
        'dốc ngực',
      ],
      videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['dumbbell fly', 'chest fly', 'dumbbell flyes', 'bướm ngực'],
      videoUrl: 'https://www.youtube.com/watch?v=eozdVDA78K0',
      source: 'AthleanX',
    },
    {
      keywords: ['push up', 'pushup', 'hít đất'],
      videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
      source: 'Calisthenicmovement',
    },
    {
      keywords: ['cable crossover', 'cable fly', 'cable chest'],
      videoUrl: 'https://www.youtube.com/watch?v=taI4XduLpTk',
      source: 'ScottHermanFitness',
    },

    // BACK EXERCISES
    {
      keywords: ['deadlift', 'barbell deadlift', 'nâng tạ đòn'],
      videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
      source: 'Buff Dudes',
    },
    {
      keywords: ['pull up', 'pullup', 'chin up', 'kéo xà'],
      videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
      source: 'AthleanX',
    },
    {
      keywords: ['barbell row', 'bent over row', 'bb row', 'chèo tạ đòn'],
      videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['lat pulldown', 'lat pull', 'kéo xô cao'],
      videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['dumbbell row', 'one arm row', 'single arm row', 'chèo tạ đơn'],
      videoUrl: 'https://www.youtube.com/watch?v=roCP6wCXPqo',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['t-bar row', 't bar row', 'tbar row'],
      videoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4',
      source: 'ScottHermanFitness',
    },

    // LEG EXERCISES
    {
      keywords: ['squat', 'back squat', 'barbell squat', 'squats'],
      videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
      source: 'AthleanX',
    },
    {
      keywords: ['leg press', 'đạp tạ chân'],
      videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['leg extension', 'quad extension', 'duỗi chân'],
      videoUrl: 'https://www.youtube.com/watch?v=YyvSfEjZIsc',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['leg curl', 'hamstring curl', 'gập chân'],
      videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['lunge', 'walking lunge', 'chùng chân'],
      videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['calf raise', 'standing calf', 'bắp chân'],
      videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI',
      source: 'ScottHermanFitness',
    },

    // SHOULDER EXERCISES
    {
      keywords: ['overhead press', 'military press', 'shoulder press', 'đẩy vai', 'barbell press'],
      videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
      source: 'AthleanX',
    },
    {
      keywords: ['lateral raise', 'side raise', 'dumbbell lateral', 'nâng tạ ngang'],
      videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
      source: 'AthleanX',
    },
    {
      keywords: ['front raise', 'anterior raise', 'nâng tạ trước'],
      videoUrl: 'https://www.youtube.com/watch?v=PLOeKLEmrBk',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['rear delt fly', 'reverse fly', 'bent over fly', 'vai sau'],
      videoUrl: 'https://www.youtube.com/watch?v=EA7u4Q_8jQ0',
      source: 'ScottHermanFitness',
    },

    // ARM EXERCISES
    {
      keywords: ['bicep curl', 'dumbbell curl', 'cuốn tay trước', 'curl'],
      videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
      source: 'AthleanX',
    },
    {
      keywords: ['hammer curl', 'neutral grip curl', 'cuốn tạ kiểu búa'],
      videoUrl: 'https://www.youtube.com/watch?v=TwD-YGVP4Bw',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['tricep extension', 'overhead extension', 'skull crusher', 'dạng tay sau'],
      videoUrl: 'https://www.youtube.com/watch?v=d_KZxkY_0cM',
      source: 'AthleanX',
    },
    {
      keywords: ['tricep pushdown', 'cable pushdown', 'rope pushdown', 'ép tay sau'],
      videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['dip', 'tricep dip', 'parallel bar dip', 'chống đẩy xà kép'],
      videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As',
      source: 'AthleanX',
    },

    // CORE/ABS EXERCISES
    {
      keywords: ['plank', 'front plank', 'chống tay'],
      videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
      source: 'AthleanX',
    },
    {
      keywords: ['crunch', 'ab crunch', 'abdominal crunch', 'gập bụng'],
      videoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU',
      source: 'Calisthenicmovement',
    },
    {
      keywords: ['russian twist', 'xoay người nga'],
      videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI',
      source: 'ScottHermanFitness',
    },
    {
      keywords: ['leg raise', 'lying leg raise', 'nâng chân'],
      videoUrl: 'https://www.youtube.com/watch?v=JB2oyawG9KI',
      source: 'AthleanX',
    },

    // CARDIO/CONDITIONING
    {
      keywords: ['running', 'treadmill', 'cardio', 'chạy bộ'],
      videoUrl: 'https://www.youtube.com/watch?v=gC_L9qAHVJ8',
      source: 'Global Triathlete',
    },
    {
      keywords: ['burpee', 'burpees'],
      videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
      source: 'CrossFit',
    },
    {
      keywords: ['mountain climber', 'mountain climbers', 'leo núi'],
      videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM',
      source: 'Howcast',
    },

    // OLYMPIC LIFTS
    {
      keywords: ['clean and jerk', 'clean & jerk', 'giật đẩy'],
      videoUrl: 'https://www.youtube.com/watch?v=PjY1rH4_MOA',
      source: 'Catalyst Athletics',
    },
    {
      keywords: ['snatch', 'power snatch', 'giật tạ'],
      videoUrl: 'https://www.youtube.com/watch?v=9xQp2sldyts',
      source: 'Catalyst Athletics',
    },

    // FUNCTIONAL/COMPOUND
    {
      keywords: ['farmer walk', 'farmers carry', 'mang tạ'],
      videoUrl: 'https://www.youtube.com/watch?v=rt17lmnaLSM',
      source: 'AthleanX',
    },
    {
      keywords: ['kettlebell swing', 'kb swing', 'swing tạ'],
      videoUrl: 'https://www.youtube.com/watch?v=YSxHifyI6s8',
      source: 'Onnit',
    },
  ];

  /**
   * Find the best matching video for an exercise
   * Uses fuzzy matching on exercise name (EN and VI)
   */
  public static findVideo(exerciseName: string): string {
    const searchTerm = exerciseName.toLowerCase().trim();

    // Try exact match first
    for (const video of this.videos) {
      for (const keyword of video.keywords) {
        if (searchTerm === keyword) {
          return video.videoUrl;
        }
      }
    }

    // Try partial match
    for (const video of this.videos) {
      for (const keyword of video.keywords) {
        if (searchTerm.includes(keyword) || keyword.includes(searchTerm)) {
          return video.videoUrl;
        }
      }
    }

    // Try word-by-word match
    const words = searchTerm.split(/\s+/);
    for (const video of this.videos) {
      for (const keyword of video.keywords) {
        const keywordWords = keyword.split(/\s+/);
        const matchedWords = words.filter((word) =>
          keywordWords.some((kw) => kw.includes(word) || word.includes(kw)),
        );

        if (matchedWords.length >= 2) {
          return video.videoUrl;
        }
      }
    }

    // Default: Return a general workout technique video
    return 'https://www.youtube.com/watch?v=IODxDxX7oi4'; // Proper form fundamentals
  }

  /**
   * Get all available exercises (for reference)
   */
  public static getAllExercises(): string[] {
    return this.videos.flatMap((v) => v.keywords);
  }
}
