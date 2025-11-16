import { Document, FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  get baseModel(): Model<T> {
    return this.model;
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return entity.save();
  }

  async findById(id: string, options: QueryOptions<T> = {}): Promise<T | null> {
    return this.model.findById(id, options?.projection, options).exec();
  }

  async findOne(filter: FilterQuery<T>, options: QueryOptions<T> = {}): Promise<T | null> {
    return this.model.findOne(filter, options?.projection, options).exec();
  }

  async find(filter: FilterQuery<T> = {}, options: QueryOptions<T> = {}): Promise<T[]> {
    return this.model.find(filter, options?.projection, options).exec();
  }

  async findWithPagination(
    filter: FilterQuery<T>,
    page: number = 1,
    limit: number = 20,
    options: QueryOptions<T> = {},
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter, options?.projection, options).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter, { strictQuery: options?.strictQuery }).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<number> {
    const result = await this.model.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }
}
