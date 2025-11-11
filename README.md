# GigaFit Backend API

> AI-Powered Fitness & Nutrition Management System - Backend Service

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=flat&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat&logo=openai)](https://openai.com/)

## 🚀 Features

### 💪 Workout Management
- **AI-Powered Workout Generation** - GPT-4o-mini generates personalized workout plans
- **Template-Based Plans** - Fallback templates for all experience levels
- **Weekly Scheduling** - Custom workout days selection
- **Exercise Library** - Bilingual exercise database (EN/VI)
- **Video Tutorials** - YouTube integration for exercise demonstrations

### 🏋️ Training Sessions
- **Session Tracking** - Start, pause, complete, or cancel training sessions
- **Exercise Logging** - Log sets, reps, and weight for each exercise
- **Active Session Management** - Prevents multiple concurrent sessions
- **Auto-Completion** - Automatically completes sessions from past days
- **Progress History** - Track all completed sessions

### 🍽️ Meal Planning (NEW)
- **AI-Generated Meal Plans** - OpenAI creates personalized meal plans
- **TDEE Calculation** - Accurate Total Daily Energy Expenditure
- **Macro Tracking** - Protein, carbs, and fat breakdown
- **Full Week or Training Days** - Flexible meal planning options
- **Bilingual Recipes** - Meals in English and Vietnamese
- **Smart Nutrition** - Goal-based calorie and macro adjustments

### 📊 Analytics & Progress
- **Weight Tracking** - Log and visualize weight changes
- **Achievement System** - Earn awards for milestones
- **Progress Reports** - Detailed analytics and statistics
- **Historical Data** - Complete workout and nutrition history

### 🔐 Authentication & Users
- **AWS Cognito Integration** - Secure authentication
- **JWT Tokens** - Stateless authentication
- **User Profiles** - Complete fitness profiles with goals
- **TDEE Profiles** - Age, gender, activity level tracking

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## 🛠 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **NestJS** | Backend Framework | 10.x |
| **TypeScript** | Type Safety | 5.x |
| **MongoDB** | Database | 7.x |
| **Mongoose** | ODM | 8.x |
| **Redis** | Caching | 7.x |
| **AWS Cognito** | Authentication | Latest |
| **OpenAI** | AI Generation | GPT-4o-mini |
| **Passport** | Auth Strategy | JWT |
| **Class Validator** | DTO Validation | 0.14.x |
| **Swagger** | API Documentation | 7.x |

---

## 🏗 Architecture

### Project Structure
```
backend/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── enums/           # TypeScript enums (Goal, ActivityLevel, Gender, etc.)
│   │   ├── interfaces/      # Shared interfaces
│   │   ├── base/            # Base classes (Repository, Controller)
│   │   ├── filters/         # Exception filters
│   │   ├── decorators/      # Custom decorators
│   │   └── middleware/      # HTTP logger middleware
│   ├── config/              # Configuration modules
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── aws.config.ts
│   │   ├── jwt.config.ts
│   │   └── ai.config.ts
│   ├── repositories/        # Centralized data layer
│   │   ├── schemas/         # Mongoose schemas
│   │   │   ├── user.schema.ts
│   │   │   ├── workout-plan.schema.ts
│   │   │   ├── training-session.schema.ts
│   │   │   ├── meal-plan.schema.ts
│   │   │   ├── weight-log.schema.ts
│   │   │   └── award.schema.ts
│   │   ├── *.repository.ts  # Repository implementations
│   │   └── repository.module.ts
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── user/            # User management
│   │   ├── workout/         # Workout plans
│   │   ├── training/        # Training sessions
│   │   ├── meal/            # Meal planning
│   │   ├── analytics/       # Progress tracking
│   │   └── ai/              # AI services
│   ├── health/              # Health check endpoints
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── test/                    # E2E tests
├── .env.example             # Environment variables template
└── README.md                # This file
```

### Design Patterns

#### 1. **Repository Pattern**
Centralized data access layer for all MongoDB operations:
```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) model: Model<User>) {
    super(model);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return this.model.findOne({ email }).exec();
  }
}
```

#### 2. **Enum-Based Constants**
Type-safe constants throughout the application:
```typescript
export enum Goal {
  MUSCLE_GAIN = 'muscle_gain',
  WEIGHT_LOSS = 'weight_loss',
  MAINTENANCE = 'maintenance',
}
```

#### 3. **DTO Validation**
Strict validation with class-validator:
```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsEnum(Goal)
  goal!: Goal;
}
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3333/api
```

### Swagger Documentation
```
http://localhost:3333/api/docs
```

### Authentication
All protected endpoints require JWT token:
```
Authorization: Bearer <token>
```

---

### 🔐 Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register new user | ❌ |
| `POST` | `/auth/login` | Login user | ❌ |

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

---

### 👤 User Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/user/profile` | Get user profile | ✅ |
| `PATCH` | `/user/profile` | Update profile | ✅ |

**Update Profile Request:**
```json
{
  "goal": "muscle_gain",
  "experienceLevel": "intermediate",
  "height": 175,
  "weight": 70,
  "targetWeight": 75,
  "age": 25,
  "gender": "male",
  "activityLevel": "moderately_active",
  "scheduleDays": ["monday", "wednesday", "friday"]
}
```

---

### 💪 Workout Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/workout/plan/generate` | Generate workout plan | ✅ |
| `GET` | `/workout/plan` | Get current plan | ✅ |

**Generate Plan Request:**
```json
{
  "goal": "muscle_gain",
  "experienceLevel": "intermediate",
  "scheduleDays": ["monday", "wednesday", "friday"],
  "weight": 70,
  "height": 175,
  "targetWeight": 75
}
```

---

### 🏋️ Training Session Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/training/session/start` | Start training session | ✅ |
| `GET` | `/training/session/active` | Get active session | ✅ |
| `POST` | `/training/session/:id/log` | Log exercise sets | ✅ |
| `POST` | `/training/session/:id/complete` | Complete session | ✅ |
| `POST` | `/training/session/:id/cancel` | Cancel session | ✅ |
| `GET` | `/training/sessions/recent` | Get recent sessions | ✅ |

**Log Exercise Request:**
```json
{
  "exercises": [
    {
      "exerciseId": "bench-press-1",
      "sets": [
        { "reps": 10, "weight": 60 },
        { "reps": 8, "weight": 65 },
        { "reps": 6, "weight": 70 }
      ]
    }
  ]
}
```

---

### 🍽️ Meal Planning Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/meal/plan/generate` | Generate meal plan | ✅ |
| `GET` | `/meal/plan` | Get current meal plan | ✅ |
| `GET` | `/meal/tdee` | Calculate TDEE | ✅ |

**Generate Meal Plan Request:**
```json
{
  "fullWeek": true,
  "useAI": true,
  "scheduleDays": ["monday", "wednesday", "friday"]
}
```

**TDEE Response:**
```json
{
  "bmr": 1650,
  "tdee": 2310,
  "targetCalories": 2540,
  "protein": 140,
  "carbs": 285,
  "fat": 70
}
```

---

### 📊 Analytics Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/analytics/weight` | Get weight history | ✅ |
| `POST` | `/analytics/weight` | Log weight | ✅ |
| `GET` | `/analytics/awards` | Get user awards | ✅ |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB 7.x (Atlas or local)
- Redis 7.x
- AWS Account (for Cognito)
- OpenAI API Key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd giga-fit/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the development server**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3333`

---

## 🔧 Environment Variables

Create a `.env` file in the backend root:

```env
# Application
NODE_ENV=development
PORT=3333

# Database
MONGODB_URI=mongodb://localhost:27017/gigafit
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gigafit

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS Cognito
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Required Services Setup

**MongoDB Atlas:**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI`

**AWS Cognito:**
1. Create User Pool in AWS Console
2. Configure app client
3. Get User Pool ID and Client ID
4. Add credentials to `.env`

**OpenAI:**
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `OPENAI_API_KEY`

**Redis:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis
redis-server
```

See `ENV_SETUP.md` for detailed setup instructions.

---

## 💾 Database Schema

### User Schema
```typescript
{
  email: string;
  cognitoSub: string;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  height?: number;
  weight?: number;
  targetWeight?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  scheduleDays: DayOfWeek[];
}
```

### Training Session Schema
```typescript
{
  userId: string;
  planId: string;
  dayOfWeek: DayOfWeek;
  startTime: Date;
  endTime?: Date;
  exercises: [
    {
      exerciseId: string;
      sets: [
        { reps: number; weight: number; }
      ]
    }
  ];
  status: SessionStatus;
}
```

### Meal Plan Schema
```typescript
{
  userId: string;
  week: number;
  year: number;
  tdee: number;
  dailyTargets: { calories, protein, carbs, fat };
  schedule: [
    {
      dayOfWeek: DayOfWeek;
      meals: [
        {
          type: MealType;
          items: [
            {
              name: { en, vi };
              description: { en, vi };
              quantity: string;
              macros: { calories, protein, carbs, fat };
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🔨 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugger

# Build
npm run build              # Build for production

# Production
npm run start:prod         # Run production build

# Testing
npm run test               # Run unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests

# Linting
npm run lint               # Run ESLint
npm run format             # Format with Prettier
```

### Code Quality

**TypeScript Strict Mode:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true
}
```

**ESLint Rules:**
- No `any` types
- Explicit return types
- Consistent naming conventions

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

Example test:
```typescript
describe('WorkoutService', () => {
  it('should generate workout plan', async () => {
    const plan = await service.generatePlan({
      goal: Goal.MUSCLE_GAIN,
      experienceLevel: ExperienceLevel.INTERMEDIATE,
      scheduleDays: [DayOfWeek.MONDAY]
    });
    
    expect(plan).toBeDefined();
    expect(plan.schedule).toHaveLength(1);
  });
});
```

---

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Run Production Server
```bash
npm run start:prod
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/main"]
```

### Environment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set secure JWT secret (min 32 chars)
- [ ] Configure AWS Cognito
- [ ] Add OpenAI API key
- [ ] Set up Redis connection
- [ ] Enable CORS for frontend domain
- [ ] Configure rate limiting

---

## 📊 Performance

### Optimizations
- **MongoDB Indexes** - Optimized queries
- **Redis Caching** - Frequently accessed data
- **Connection Pooling** - Efficient DB connections
- **Lazy Loading** - Modules loaded on demand

### Monitoring
- Health check endpoints (`/api/health`)
- Request/response logging
- Error tracking ready (Sentry)
- Performance metrics

---

## 🔒 Security

### Implemented
- ✅ JWT Authentication
- ✅ AWS Cognito integration
- ✅ Password hashing (Cognito)
- ✅ Input validation (class-validator)
- ✅ CORS configuration
- ✅ Rate limiting ready
- ✅ SQL injection prevention (MongoDB)
- ✅ XSS protection

### Best Practices
- Environment variables for secrets
- No sensitive data in logs
- Secure headers (Helmet.js ready)
- Input sanitization

---

## 📝 License

This project is proprietary and confidential.

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Write/update tests
4. Run linter and tests
5. Submit pull request

### Code Style
- Use TypeScript strict mode
- No `any` types
- Enum-based constants
- Async/await over promises
- Descriptive variable names
- JSDoc comments for complex logic

---

## 📞 Support

For issues and questions:
- Check documentation in `/docs`
- Review `ARCHITECTURE.md`
- See `ENV_SETUP.md` for setup help

---

## 🎉 Features Summary

✅ AI-Powered Workout Generation  
✅ AI-Powered Meal Planning  
✅ Exercise Logging (Sets/Reps/Weight)  
✅ Active Session Management  
✅ Auto-Complete Old Sessions  
✅ TDEE & Macro Calculations  
✅ Weight Tracking & Analytics  
✅ Achievement System  
✅ Bilingual Support (EN/VI)  
✅ AWS Cognito Authentication  
✅ Swagger API Documentation  
✅ Type-Safe (100% TypeScript)  
✅ Centralized Repository Pattern  
✅ Production Ready  

**Built with ❤️ using NestJS and TypeScript**
