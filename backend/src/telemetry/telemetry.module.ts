import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { KeystrokeWindow } from './entities/keystroke-window.entity';
import { CodeDelta } from './entities/code-delta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KeystrokeWindow, CodeDelta])],
  providers: [TelemetryService],
  controllers: [TelemetryController],
  exports: [TelemetryService],
})
export class TelemetryModule {}
