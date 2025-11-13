export enum WebSocketEvent {
  // Connection events
  REGISTER_USER = 'register-user',
  REGISTRATION_SUCCESS = 'registration-success',
  REGISTRATION_ERROR = 'registration-error',

  // Workout generation events
  WORKOUT_GENERATION_STARTED = 'workout-generation-started',
  WORKOUT_GENERATION_PROGRESS = 'workout-generation-progress',
  WORKOUT_GENERATION_COMPLETE = 'workout-generation-complete',
  WORKOUT_GENERATION_ERROR = 'workout-generation-error',

  // Meal plan generation events
  MEAL_GENERATION_STARTED = 'meal-generation-started',
  MEAL_GENERATION_PROGRESS = 'meal-generation-progress',
  MEAL_GENERATION_COMPLETE = 'meal-generation-complete',
  MEAL_GENERATION_ERROR = 'meal-generation-error',

  // Exercise crawling events
  EXERCISE_CRAWL_STARTED = 'exercise-crawl-started',
  EXERCISE_CRAWL_PROGRESS = 'exercise-crawl-progress',
  EXERCISE_CRAWL_COMPLETE = 'exercise-crawl-complete',
  EXERCISE_CRAWL_ERROR = 'exercise-crawl-error',
}

export enum WebSocketRoom {
  USER_PREFIX = 'user:',
  ADMIN = 'admin',
  BROADCAST = 'broadcast',
}
