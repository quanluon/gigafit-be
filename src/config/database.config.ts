import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gigafit',
  uriTest: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/gigafit-test',
}));
