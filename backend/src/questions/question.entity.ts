import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() language: string;
  @Column() difficulty: string;
  @Column('text') problemStatement: string;
  @Column('text') constraints: string;
  @Column('text') sampleInput: string;
  @Column('text') sampleOutput: string;
  @Column('jsonb') testCases: { input: string; expectedOutput: string }[];
  @Column('jsonb', { default: [] }) hints: string[];
  @Column({ default: 45 }) timeLimitMinutes: number;
  @CreateDateColumn() createdAt: Date;
}
