import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeystrokeWindow } from './entities/keystroke-window.entity';
import { CodeDelta } from './entities/code-delta.entity';
import { TelemetryWindowDto, CodeDeltaBatchDto } from './dto/telemetry-window.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(KeystrokeWindow)
    private readonly windowRepo: Repository<KeystrokeWindow>,
    @InjectRepository(CodeDelta)
    private readonly deltaRepo: Repository<CodeDelta>,
  ) {}

  // ── Feature 1: Keystroke windows ─────────────────────────────────────────

  async recordWindow(submissionId: string, dto: TelemetryWindowDto): Promise<{ recorded: boolean }> {
    const window = this.windowRepo.create({
      submissionId,
      windowIndex: dto.windowIndex,
      featureVector: dto.featureVector,
    });
    await this.windowRepo.save(window);
    return { recorded: true };
  }

  /**
   * Rule-based v1 originality scorer.
   *
   * Scoring logic:
   *   - High paste ratio (>50% of chars from multi-char inserts):  -25pts
   *   - Large single insertion event (>150 chars):                  -20pts
   *   - Unnaturally uniform inter-keystroke timing (stdDev < 5ms
   *     with >30 typed chars — characteristic of synthetic input):  -15pts
   *
   * Score: 0–100. Higher = more likely organic human typing.
   * At 100 (no signal), this does NOT mean the code is original —
   * it means there's no mechanical evidence of non-organic entry.
   *
   * Replace with a trained ML classifier once labeled data exists.
   * NEVER auto-fail a student based on this score — it is a review flag only.
   */
  async computeOriginalityScore(submissionId: string): Promise<number> {
    const windows = await this.windowRepo.find({
      where: { submissionId },
      order: { windowIndex: 'ASC' },
    });

    if (windows.length === 0) return 100; // no signal — don't penalise

    let score = 100;
    let totalPastedChars = 0;
    let totalTypedChars = 0;
    let maxInsertion = 0;

    for (const w of windows) {
      const fv = w.featureVector;
      totalPastedChars += fv.pastedCharCount;
      totalTypedChars += fv.typedCharCount;
      maxInsertion = Math.max(maxInsertion, fv.maxSingleInsertionLength);

      // Unnaturally uniform typing speed within this window
      if (fv.stdDevInterKeyMs < 5 && fv.typedCharCount > 30) {
        score -= 15;
      }
    }

    const totalChars = totalPastedChars + totalTypedChars;
    const pasteRatio = totalChars > 0 ? totalPastedChars / totalChars : 0;

    if (pasteRatio > 0.5) score -= 25;
    if (maxInsertion > 150) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  // ── Feature 3: Code deltas for time-travel playback ──────────────────────

  async recordDeltas(submissionId: string, dto: CodeDeltaBatchDto): Promise<{ recorded: number }> {
    const entities = dto.deltas.map((d) =>
      this.deltaRepo.create({
        submissionId,
        sequenceNum: d.sequenceNum,
        deltaJson: {
          range: d.range,
          text: d.text,
          rangeLength: d.rangeLength,
        },
        timestampMs: d.timestampMs,
      }),
    );
    await this.deltaRepo.save(entities);
    return { recorded: entities.length };
  }

  async getDeltas(submissionId: string) {
    return this.deltaRepo.find({
      where: { submissionId },
      order: { sequenceNum: 'ASC' },
      select: ['sequenceNum', 'deltaJson', 'timestampMs'],
    });
  }
}
