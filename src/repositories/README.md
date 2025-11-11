# Repository Module

This module contains all database schemas and repositories for the GigaFit application.

## Architecture

All data access is centralized in this module:
- **Schemas**: MongoDB/Mongoose schemas
- **Repositories**: Data access layer extending BaseRepository
- **Global Module**: Available throughout the application

## Structure

```
repositories/
├── schemas/
│   ├── user.schema.ts
│   ├── workout-plan.schema.ts
│   ├── training-session.schema.ts
│   └── index.ts
├── user.repository.ts
├── workout.repository.ts
├── training-session.repository.ts
├── repository.module.ts
└── index.ts
```

## Usage

The RepositoryModule is globally available. Import repositories directly in your services:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  
  async findUser(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }
}
```

## Adding New Repository

1. Create schema in `schemas/`:
```typescript
@Schema({ timestamps: true })
export class NewEntity extends Document {
  @Prop({ required: true })
  name!: string;
}
```

2. Create repository:
```typescript
@Injectable()
export class NewRepository extends BaseRepository<NewEntity> {
  constructor(@InjectModel(NewEntity.name) model: Model<NewEntity>) {
    super(model);
  }
}
```

3. Register in `repository.module.ts`:
```typescript
const schemas = [
  // ... existing schemas
  { name: NewEntity.name, schema: NewEntitySchema },
];

const repositories = [
  // ... existing repositories
  NewRepository,
];
```

## BaseRepository Methods

All repositories inherit these methods:
- `create(data)` - Create new document
- `findById(id)` - Find by ID
- `findOne(filter)` - Find one document
- `find(filter)` - Find multiple documents
- `findWithPagination(filter, page, limit)` - Paginated results
- `update(id, data)` - Update document
- `updateMany(filter, data)` - Update multiple
- `delete(id)` - Delete document
- `deleteMany(filter)` - Delete multiple
- `count(filter)` - Count documents
- `exists(filter)` - Check existence

## Benefits

✅ **Centralized Data Layer**: Single source for all data access
✅ **Type Safety**: Full TypeScript support with no `any` types
✅ **Reusability**: BaseRepository provides common operations
✅ **Global Access**: Available in all modules via @Global()
✅ **Consistency**: Same patterns across all data access
✅ **Testability**: Easy to mock repositories

