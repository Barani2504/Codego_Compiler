import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMIN   = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true, length: 20 }) regNumber: string;
  @Column({ length: 100 }) name: string;
  @Column({ length: 20 }) department: string;
  @Column({ type: 'int' }) year: number;
  @Column() password: string;

  @Column({ default: true }) mustChangePassword: boolean;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT }) role: UserRole;

  @Column({ type: 'int', default: 0 }) totalAssessments: number;
  @Column({ type: 'int', default: 0 }) totalPassed: number;
  @Column({ type: 'float', default: 0 }) averageScore: number;
  @Column({ type: 'int', default: 0 }) currentStreak: number;
  @Column({ type: 'int', default: 0 }) longestStreak: number;
  @Column({ type: 'date', nullable: true }) lastSubmissionDate: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
