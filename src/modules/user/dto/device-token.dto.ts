import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../../../repositories/schemas/device-token.schema';

export class UpsertDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}
