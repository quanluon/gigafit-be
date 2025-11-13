import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { OpenAIStrategy } from './strategies/openai.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';
import { RepositoryModule } from '../../repositories/repository.module';

@Module({
  imports: [ConfigModule, RepositoryModule],
  providers: [AIService, OpenAIStrategy, GeminiStrategy],
  exports: [AIService],
})
export class AIModule {}
