import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submissions/submission.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepo: Repository<Submission>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async getAllResults(filters: {
    department?: string;
    difficulty?: string;
    language?: string;
    year?: number;
  }) {
    const q = this.submissionsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .where('s.status = :status', { status: 'completed' })
      .orderBy('s.createdAt', 'DESC');

    if (filters.department)
      q.andWhere('u.department = :dept', { dept: filters.department });
    if (filters.difficulty)
      q.andWhere('s.difficulty = :diff', { diff: filters.difficulty });
    if (filters.language)
      q.andWhere('s.language = :lang', { lang: filters.language });
    if (filters.year) q.andWhere('u.year = :year', { year: filters.year });

    const rows = await q.getMany();
    return rows.map((s) => ({
      id: s.id,
      regNumber: s.user?.regNumber,
      name: s.user?.name,
      department: s.user?.department,
      year: s.user?.year,
      language: s.language,
      difficulty: s.difficulty,
      score: s.score,
      passed: s.passed,
      testsPassed: s.testsPassed,
      testsTotal: s.testsTotal,
      submittedAt: s.createdAt,
    }));
  }

  async getSummaryStats() {
    const byDiff = await this.submissionsRepo
      .createQueryBuilder('s')
      .select('s.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(s.score)', 'avgScore')
      .addSelect('SUM(CASE WHEN s.passed = true THEN 1 ELSE 0 END)', 'passed')
      .where('s.status = :status', { status: 'completed' })
      .groupBy('s.difficulty')
      .getRawMany();

    const topStudents = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.totalAssessments > 0')
      .orderBy('u.averageScore', 'DESC')
      .take(10)
      .select([
        'u.regNumber',
        'u.name',
        'u.department',
        'u.averageScore',
        'u.totalPassed',
      ])
      .getMany();

    return { byDiff, topStudents };
  }

  async exportCSV(filters: any): Promise<string> {
    const results = await this.getAllResults(filters);
    const csvField = (v: any): string => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const header =
      'RegNumber,Name,Department,Year,Language,Difficulty,Score,Passed,SubmittedAt';
    const rows = results.map((r) =>
      [
        r.regNumber,
        r.name,
        r.department,
        r.year,
        r.language,
        r.difficulty,
        r.score,
        r.passed,
        r.submittedAt,
      ]
        .map(csvField)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
