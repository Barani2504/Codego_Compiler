import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { Submission } from '../../submissions/submission.entity';

/**
 * KeystrokeWindow — one 2.5-second windowed feature vector per submission.
 *
 * The frontend computes these features client-side (no raw keystroke content
 * is sent over the wire — only timing metadata). This is the primary data
 * structure for the rule-based originality scorer and the eventual ML classifier.
 */
@Entity('keystroke_windows')
@Index(['submission'])
export class KeystrokeWindow {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column({ name: 'submissionId' })
  submissionId: string;

  @Column('int')
  windowIndex: number;

  @Column('jsonb')
  featureVector: {
    /** Mean inter-keystroke interval in ms — natural typing ~50-300ms */
    meanInterKeyMs: number;
    /** Std dev of IKT — low variance = unnaturally uniform (bot / generated) */
    stdDevInterKeyMs: number;
    /** Characters inserted in multi-char single events (paste-like behaviour) */
    pastedCharCount: number;
    /** Single-character keydown events (true typing) */
    typedCharCount: number;
    /** Largest single insertion event in this window — >150 chars is a red flag */
    maxSingleInsertionLength: number;
    /** Rapid-fire key sequences: ≥6 keys with <50ms inter-key time */
    burstCount: number;
  };

  @CreateDateColumn() createdAt: Date;
}
