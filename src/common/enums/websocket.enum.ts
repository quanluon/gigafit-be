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

  // Inbody OCR events
  INBODY_OCR_STARTED = 'inbody-ocr-started',
  INBODY_OCR_PROGRESS = 'inbody-ocr-progress',
  INBODY_OCR_COMPLETE = 'inbody-ocr-complete',
  INBODY_OCR_ERROR = 'inbody-ocr-error',

  // InBody scan events
  INBODY_SCAN_STARTED = 'inbody.scan.started',
  INBODY_SCAN_PROGRESS = 'inbody.scan.progress',
  INBODY_SCAN_COMPLETE = 'inbody.scan.complete',
  INBODY_SCAN_ERROR = 'inbody.scan.error',

  // Body photo analysis events
  BODY_PHOTO_ANALYSIS_STARTED = 'body-photo.analysis.started',
  BODY_PHOTO_ANALYSIS_PROGRESS = 'body-photo.analysis.progress',
  BODY_PHOTO_ANALYSIS_COMPLETE = 'body-photo.analysis.complete',
  BODY_PHOTO_ANALYSIS_ERROR = 'body-photo.analysis.error',
}

export enum WebSocketRoom {
  USER_PREFIX = 'user:',
  ADMIN = 'admin',
  BROADCAST = 'broadcast',
}
