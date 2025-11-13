/**
 * AI Model Constants
 * Centralized configuration for all AI model identifiers
 */

/**
 * OpenAI Model Constants
 */
export const OPENAI_MODELS = {
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O: 'gpt-4o',
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_35_TURBO: 'gpt-3.5-turbo',
  GPT_50_NANO: 'gpt-50-nano',
} as const;

/**
 * Google Gemini Model Constants
 */
export const GEMINI_MODELS = {
  GEMINI_2_5_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_PRO: 'gemini-pro',
  GEMINI_PRO_VISION: 'gemini-pro-vision',
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
} as const;

/**
 * Default Models for Each Provider
 */
export const DEFAULT_AI_MODELS = {
  OPENAI: OPENAI_MODELS.GPT_4O,
  GEMINI: GEMINI_MODELS.GEMINI_2_5_FLASH,
} as const;

/**
 * Temperature Settings
 */
export const AI_TEMPERATURE = {
  CREATIVE: 0.9,
  BALANCED: 0.7,
  PRECISE: 0.3,
  DETERMINISTIC: 0,
} as const;

/**
 * Max Tokens Settings
 */
export const AI_MAX_TOKENS = {
  SMALL: 500,
  MEDIUM: 1000,
  LARGE: 2000,
  EXTRA_LARGE: 4000,
} as const;

/**
 * Type exports for type safety
 */
export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];
export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];
export type AIModel = OpenAIModel | GeminiModel;
