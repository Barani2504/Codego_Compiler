import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submissions/submission.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async getStudentProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const byDifficulty = await this.submissionsRepo.createQueryBuilder('s')
      .select('s.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(s.score)', 'avgScore')
      .addSelect('SUM(CASE WHEN s.passed = true THEN 1 ELSE 0 END)', 'passed')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('s.difficulty')
      .getRawMany();

    const byLanguage = await this.submissionsRepo.createQueryBuilder('s')
      .select('s.language', 'language')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(s.score)', 'avgScore')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('s.language')
      .getRawMany();

    const recentSubmissions = await this.submissionsRepo.find({
      where: { userId, status: 'completed' as any },
      relations: ['question'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const scoreTrend = recentSubmissions.map(s => ({
      date: s.createdAt, score: s.score,
      language: s.language, difficulty: s.difficulty, passed: s.passed,
    })).reverse();

    return {
      student: {
        name: user.name, regNumber: user.regNumber,
        department: user.department, year: user.year,
        totalAssessments: user.totalAssessments, totalPassed: user.totalPassed,
        averageScore: user.averageScore,
        passRate: user.totalAssessments > 0 ? Math.round((user.totalPassed / user.totalAssessments) * 100) : 0,
        currentStreak: user.currentStreak, longestStreak: user.longestStreak,
      },
      byDifficulty,
      byLanguage,
      scoreTrend,
      recentSubmissions: recentSubmissions.map(s => ({
        id: s.id, language: s.language, difficulty: s.difficulty,
        score: s.score, passed: s.passed, submittedAt: s.createdAt,
      })),
    };
  }
}
