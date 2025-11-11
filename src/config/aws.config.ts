import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  cognito: {
    userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
    clientId: process.env.AWS_COGNITO_CLIENT_ID || '',
    authority: process.env.AWS_COGNITO_AUTHORITY || '',
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}));
