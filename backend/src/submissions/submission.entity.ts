import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Question } from '../questions/question.entity';

export enum SubmissionStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  COMPLETED = 'completed',
  ERROR     = 'error',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
  @Column() userId: string;

  @ManyToOne(() => Question) @JoinColumn({ name: 'questionId' }) question: Question;
  @Column() questionId: string;

  @Column('text') code: string;
  @Column() language: string;
  @Column() difficulty: string;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING })
  status: SubmissionStatus;

  @Column({ type: 'int', default: 0 }) score: number;
  @Column({ default: false }) passed: boolean;
  @Column({ type: 'int', default: 0 }) testsPassed: number;
  @Column({ type: 'int', default: 0 }) testsTotal: number;

  @Column({ type: 'jsonb', nullable: true }) gradeResult: any;

  @CreateDateColumn() createdAt: Date;
}
