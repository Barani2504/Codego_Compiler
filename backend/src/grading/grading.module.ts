import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { OllamaCircuitBreakerService } from './ollama-circuit-breaker.service';

@Module({
  providers: [GradingService, OllamaCircuitBreakerService],
  exports: [GradingService, OllamaCircuitBreakerService],
})
export class GradingModule {}
