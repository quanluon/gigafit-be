import { registerAs } from '@nestjs/config';
import { AIProvider } from '../common/enums';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || AIProvider.OPENAI, // 'openai' or 'gemini'
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
}));
