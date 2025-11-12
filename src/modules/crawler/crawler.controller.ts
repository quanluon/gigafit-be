import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse } from '../../common/interfaces';
import { MuscleGroup } from '../../repositories/schemas/exercise.schema';
import { CrawlerService } from './crawler.service';

@ApiTags('crawler')
@Controller('crawler')
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrawlerController extends BaseController {
  constructor(private readonly crawlerService: CrawlerService) {
    super();
  }

  @Post('crawl/all')
  @ApiOperation({ summary: 'Crawl exercises from all sources (YouTube + TikTok) - Admin only' })
  async crawlAll(
    @Query('videosPerGroup') videosPerGroup?: string,
  ): Promise<ApiResponse<{ youtube: number; tiktok: number; total: number }>> {
    const count = videosPerGroup ? parseInt(videosPerGroup, 10) : 5;
    const result = await this.crawlerService.crawlAllSources(count);
    return this.success(result, `Crawled ${result.total} exercises successfully`);
  }

  @Post('crawl/muscle-group/:muscleGroup')
  @ApiOperation({
    summary: 'Crawl exercises for specific muscle group from YouTube + TikTok - Admin only',
  })
  async crawlMuscleGroup(
    @Param('muscleGroup') muscleGroup: MuscleGroup,
    @Query('videosPerSource') videosPerSource?: string,
  ): Promise<ApiResponse<{ youtube: number; tiktok: number; total: number }>> {
    const count = videosPerSource ? parseInt(videosPerSource, 10) : 5;
    const result = await this.crawlerService.crawlMuscleGroup(muscleGroup, count);
    return this.success(result, `Crawled ${result.total} ${muscleGroup} exercises`);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get exercise database statistics' })
  async getStatistics(): Promise<
    ApiResponse<{
      total: number;
      bySource: Record<string, number>;
      byMuscleGroup: Record<string, number>;
      mostPopular: Array<{ name: string; usageCount: number }>;
    }>
  > {
    const stats = await this.crawlerService.getStatistics();
    return this.success(stats);
  }

  @Post('refresh/:exerciseId')
  @ApiOperation({ summary: 'Refresh exercise metadata (Admin only)' })
  async refreshMetadata(
    @Param('exerciseId') exerciseId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.crawlerService.refreshMetadata(exerciseId);
    return this.success({ message: 'Metadata refreshed successfully' });
  }
}
