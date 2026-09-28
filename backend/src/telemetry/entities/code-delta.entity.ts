import {
  Entity, PrimaryGeneratedColumn, Column,
  Index, CreateDateColumn,
} from 'typeorm';

/**
 * CodeDelta — a single Monaco editor change event stored as an ordered log.
 *
 * Storing deltas (not periodic snapshots) lets us reconstruct the exact editor
 * state at any millisecond timestamp by replaying events from the initial
 * boilerplate. Deltas are far smaller than snapshots and support the time-travel
 * playback UI without any additional capture work.
 *
 * The Monaco `onDidChangeModelContent` event gives us these {range, text} objects
 * for free — it's the same mechanism VS Code uses internally for undo/redo.
 */
@Entity('code_deltas')
@Index(['submissionId', 'sequenceNum'])
export class CodeDelta {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() submissionId: string;

  @Column('int')
  sequenceNum: number;

  /**
   * The raw Monaco `IModelContentChange` object serialised to JSON.
   * Shape: { range: { startLine, startColumn, endLine, endColumn }, text: string }
   *
   * A delta inserting >80 characters in one event is auto-flagged red in the
   * playback timeline (same paste signal from Feature 1, just visualised).
   */
  @Column('jsonb')
  deltaJson: {
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; };
    text: string;
    rangeLength: number;
  };

  /** Client-side performance.now() offset from session start (ms) */
  @Column('bigint')
  timestampMs: number;

  @CreateDateColumn() createdAt: Date;
}
