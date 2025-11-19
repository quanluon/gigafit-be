import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  pid: number;
}
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
    };
  }
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  ready(): Promise<{ ready: boolean; pid: number }> {
    // Add checks for database, redis, etc.
    return Promise.resolve({ ready: true, pid: process.pid });
  }
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  live(): Promise<{ alive: boolean }> {
    return Promise.resolve({ alive: true, pid: process.pid });
  }
}
