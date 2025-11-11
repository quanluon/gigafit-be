# GigaFit Backend Architecture

## Overview

The backend follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│          Controllers (HTTP Layer)           │
├─────────────────────────────────────────────┤
│           Services (Business Logic)         │
├─────────────────────────────────────────────┤
│     Repositories (Data Access Layer)        │
├─────────────────────────────────────────────┤
│         Schemas (Data Models)               │
├─────────────────────────────────────────────┤
│           Database (MongoDB)                │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
backend/src/
├── common/                    # Shared utilities
│   ├── base/                  # BaseRepository, BaseController
│   ├── enums/                 # Shared enums (Goal, DayOfWeek, etc.)
│   ├── interfaces/            # Shared interfaces
│   └── filters/               # Exception filters
│
├── config/                    # Configuration files
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── aws.config.ts
│   ├── jwt.config.ts
│   └── ai.config.ts
│
├── database/                  # Database connection module
│   └── database.module.ts
│
├── repositories/              # 🔥 DATA LAYER (Centralized)
│   ├── schemas/              # All MongoDB schemas
│   │   ├── user.schema.ts
│   │   ├── workout-plan.schema.ts
│   │   ├── training-session.schema.ts
│   │   └── index.ts
│   ├── user.repository.ts     # User data access
│   ├── workout.repository.ts  # Workout data access
│   ├── training-session.repository.ts
│   ├── repository.module.ts   # Global module
│   ├── index.ts              # Barrel exports
│   └── README.md             # Documentation
│
├── modules/                   # Feature modules
│   ├── auth/                 # Authentication
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── user/                 # User management
│   │   ├── dto/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   │
│   ├── workout/              # Workout planning
│   │   ├── dto/
│   │   ├── workout.controller.ts
│   │   ├── workout.service.ts
│   │   └── workout.module.ts
│   │
│   └── ai/                   # AI services
│       ├── ai.service.ts
│       └── ai.module.ts
│
├── app.module.ts             # Root module
└── main.ts                   # Application entry
```

## Key Architectural Decisions

### 1. Centralized Repository Module

**Location:** `/src/repositories/`

All schemas and repositories are centralized in a single location:

✅ **Benefits:**
- Single source of truth for data models
- Easy to find and modify schemas
- Prevents duplication
- Clear separation between data layer and business logic
- Global access via `@Global()` decorator

**Usage:**
```typescript
// In any service
import { UserRepository, User } from '@/repositories';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
}
```

### 2. Global Repository Module

The `RepositoryModule` is marked as `@Global()`, making all repositories available throughout the application without explicit imports in feature modules.

```typescript
@Global()
@Module({
  imports: [MongooseModule.forFeature(schemas)],
  providers: repositories,
  exports: repositories,
})
export class RepositoryModule {}
```

### 3. Path Aliases

TypeScript path aliases for clean imports:

```typescript
// tsconfig.json
"paths": {
  "@/*": ["src/*"],
  "@common/*": ["src/common/*"],
  "@repositories": ["src/repositories"]
}
```

Usage:
```typescript
import { User, UserRepository } from '@/repositories';
import { Goal, DayOfWeek } from '@common/enums';
```

### 4. BaseRepository Pattern

All repositories extend `BaseRepository<T>` which provides:
- `create(data)` - Create document
- `findById(id)` - Find by ID
- `findOne(filter)` - Find single document
- `find(filter)` - Find multiple documents
- `findWithPagination(filter, page, limit)` - Paginated results
- `update(id, data)` - Update document
- `updateMany(filter, data)` - Bulk update
- `delete(id)` - Delete document
- `deleteMany(filter)` - Bulk delete
- `count(filter)` - Count documents
- `exists(filter)` - Check existence

Custom methods are added in specific repositories:
```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }
}
```

### 5. Feature Modules

Feature modules focus **only on business logic**:
- Controllers handle HTTP requests
- Services implement business logic
- Repositories are injected (not owned)

```typescript
@Module({
  imports: [AIModule], // Only business dependencies
  controllers: [WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}
```

### 6. Type Safety

**CRITICAL RULES:**
- ❌ NO `any` TYPE - All types must be explicit
- ✅ USE ENUMS - No hardcoded strings
- ✅ Strict TypeScript mode enabled
- ✅ Explicit return types on all functions

## Data Flow

### Example: Create Workout Plan

```
1. HTTP Request
   ↓
2. WorkoutController.generatePlan()
   ↓
3. WorkoutService.generatePlan()
   ├─→ AIService.generateWorkoutPlan()
   └─→ WorkoutRepository.create()
       ↓
4. MongoDB (via Mongoose)
```

### Import Pattern

```typescript
// ✅ Good - Clean imports from centralized location
import { User, UserRepository } from '@/repositories';
import { Goal, ExperienceLevel } from '@common/enums';

// ❌ Bad - Relative paths from scattered locations
import { User } from '../../repositories/schemas/user.schema';
import { UserRepository } from '../../repositories/user.repository';
```

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| **DatabaseModule** | MongoDB connection configuration |
| **RepositoryModule** | Global data access layer |
| **AuthModule** | Authentication & authorization |
| **UserModule** | User management business logic |
| **WorkoutModule** | Workout planning business logic |
| **AIModule** | AI workout generation |

## Testing Strategy

### Unit Tests
```typescript
describe('UserService', () => {
  it('should find user by email', async () => {
    const mockRepository = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
    };
    
    const service = new UserService(mockRepository as any);
    const result = await service.findByEmail('test@example.com');
    
    expect(result).toEqual(mockUser);
  });
});
```

### Integration Tests
- Test with real database (test environment)
- Use MongoMemoryServer for isolated tests
- Verify repository patterns work correctly

## Scalability

### Adding New Entity

1. **Create schema**: `/repositories/schemas/new-entity.schema.ts`
2. **Create repository**: `/repositories/new-entity.repository.ts`
3. **Register in module**: Add to `RepositoryModule`
4. **Use in services**: Inject via constructor

### Adding New Feature

1. Create feature module in `/modules/new-feature/`
2. Create service and controller
3. Inject repositories as needed
4. Register module in `AppModule`

## Performance Considerations

- **Indexes**: Add MongoDB indexes in schemas
- **Caching**: Redis for frequently accessed data
- **Pagination**: Use `findWithPagination()` for large datasets
- **Bulk Operations**: Use `updateMany()`, `deleteMany()` when possible

## Security

- **JWT Authentication**: Via Passport + AWS Cognito
- **Authorization Guards**: Protect routes with `@UseGuards(JwtAuthGuard)`
- **Validation**: DTOs with `class-validator`
- **Type Safety**: Strict TypeScript prevents runtime errors

---

**Version:** 1.0  
**Last Updated:** Sprint 2 Completion  
**Maintained By:** GigaFit Dev Team

