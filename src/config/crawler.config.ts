import { registerAs } from '@nestjs/config';

export default registerAs('crawler', () => ({
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    maxResultsPerQuery: parseInt(process.env.YOUTUBE_MAX_RESULTS || '10', 10),
  },
  tiktok: {
    apiKey: process.env.TIKTOK_API_KEY || '',
    maxResultsPerQuery: parseInt(process.env.TIKTOK_MAX_RESULTS || '10', 10),
  },
  schedule: {
    enabled: process.env.CRAWLER_SCHEDULE_ENABLED === 'true',
    cron: process.env.CRAWLER_CRON_EXPRESSION || '0 2 * * 0', // Every Sunday at 2 AM
  },
}));
