export class ExerciseLoggedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly exercises: Array<{
      exerciseId: string;
      name: { en: string; vi: string };
      sets: Array<{ reps: number; weight: number }>;
    }>,
  ) {}
}
