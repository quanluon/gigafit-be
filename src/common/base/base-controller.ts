import { ApiResponse } from '../interfaces/api-response.interface';

export abstract class BaseController {
  protected success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  protected error(error: string, message?: string): ApiResponse<never> {
    return {
      success: false,
      error,
      message,
    };
  }
}
