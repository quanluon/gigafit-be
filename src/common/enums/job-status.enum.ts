export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

export enum JobProgress {
  STARTED = 10,
  GENERATING = 50,
  FINALIZING = 90,
  COMPLETE = 100,
}
