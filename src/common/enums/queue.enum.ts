export enum QueueName {
  WORKOUT_GENERATION = 'workout-generation',
  MEAL_GENERATION = 'meal-generation',
  EXERCISE_CRAWLING = 'exercise-crawling',
  INBODY_OCR = 'inbody-ocr',
}

export enum JobName {
  GENERATE_WORKOUT_PLAN = 'generate-workout-plan',
  GENERATE_MEAL_PLAN = 'generate-meal-plan',
  CRAWL_EXERCISES = 'crawl-exercises',
  PROCESS_INBODY_REPORT = 'process-inbody-report',
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  STUCK = 'stuck',
}

export enum JobProgress {
  STARTED = 10,
  GENERATING = 50,
  FINALIZING = 90,
  COMPLETED = 100,
}

// RabbitMQ patterns for microservices communication
export enum RabbitMQPattern {
  WORKOUT_GENERATE = 'workout.generate',
  WORKOUT_STATUS = 'workout.status',
  MEAL_GENERATE = 'meal.generate',
  MEAL_STATUS = 'meal.status',
}
