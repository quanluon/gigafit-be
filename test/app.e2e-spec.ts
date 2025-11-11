import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) - health check', () => {
    return request(app.getHttpServer()).get('/').expect(404); // No root route defined
  });

  describe('Auth endpoints', () => {
    it('/api/auth/register (POST) - should validate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
    });

    it('/api/auth/register (POST) - should validate password length', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' })
        .expect(400);
    });
  });
});

