import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry logic
 * @param fn Function to execute
 * @param options Retry configuration
 * @param logger Optional logger for debugging
 * @returns Promise with the result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: Logger,
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (config.shouldRetry && !config.shouldRetry(error)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
      const delay = Math.min(exponentialDelay, config.maxDelay);

      // Add jitter (random 0-25% of delay) to prevent thundering herd
      const jitter = Math.random() * delay * 0.25;
      const finalDelay = delay + jitter;

      if (logger) {
        logger.warn(
          `Attempt ${attempt}/${config.maxAttempts} failed. Retrying in ${Math.round(finalDelay)}ms... Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Wait before retrying
      await sleep(finalDelay);
    }
  }

  throw lastError;
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    // OpenAI SDK error format
    if ('status' in error && error.status === 429) {
      return true;
    }
    // Check error code
    if ('code' in error && error.code === 'rate_limit_exceeded') {
      return true;
    }
    // Axios error format
    if ('response' in error) {
      const errorWithResponse = error as { response?: { status?: number } };
      if (errorWithResponse.response?.status === 429) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract retry-after value from error (in milliseconds)
 */
export function getRetryAfter(error: unknown): number | null {
  if (error && typeof error === 'object') {
    // Check headers
    if ('headers' in error && error.headers) {
      const headers = error.headers as Record<string, string | number>;

      // retry-after-ms (milliseconds)
      if (headers['retry-after-ms']) {
        const value = headers['retry-after-ms'];
        const ms = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(ms)) return ms;
      }

      // retry-after (seconds)
      if (headers['retry-after']) {
        const value = headers['retry-after'];
        const seconds = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(seconds)) return seconds * 1000;
      }
    }
  }
  return null;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limit aware retry - respects retry-after headers
 */
export async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: Logger,
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_OPTIONS,
    shouldRetry: isRateLimitError,
    ...options,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Try to get retry-after from error
      const retryAfter = getRetryAfter(error);
      let delay: number;

      if (retryAfter) {
        // Use retry-after from API
        delay = retryAfter;
        if (logger) {
          logger.warn(
            `Rate limit hit on attempt ${attempt}/${config.maxAttempts}. API suggests waiting ${retryAfter}ms.`,
          );
        }
      } else {
        // Fallback to exponential backoff
        const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        delay = Math.min(exponentialDelay, config.maxDelay);

        if (logger) {
          logger.warn(
            `Rate limit hit on attempt ${attempt}/${config.maxAttempts}. Using exponential backoff: ${delay}ms.`,
          );
        }
      }

      // Add small jitter
      const jitter = Math.random() * delay * 0.1;
      const finalDelay = delay + jitter;

      // Wait before retrying
      await sleep(finalDelay);
    }
  }

  throw lastError;
}
