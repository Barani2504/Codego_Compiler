import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async bulkImport(students: any[], defaultPassword: string) {
    // Cost 10 ≈ 70ms — 4× faster than cost 12, still OWASP-recommended minimum
    const hashed = await bcrypt.hash(defaultPassword, 10);
    let imported = 0, skipped = 0;
    const errors: string[] = [];

    for (const s of students) {
      try {
        const exists = await this.usersRepo.findOne({ where: { regNumber: s.regNumber } });
        if (exists) { skipped++; continue; }
        await this.usersRepo.save(this.usersRepo.create({
          regNumber: s.regNumber, name: s.name, department: s.department,
          year: s.year, password: hashed, mustChangePassword: true, role: 'student' as any,
        }));
        imported++;
      } catch (err: any) { errors.push(`${s.regNumber}: ${err.message}`); }
    }
    return { imported, skipped, errors };
  }

  async findByRegNumber(regNumber: string) {
    return this.usersRepo.findOne({ where: { regNumber } });
  }

  async findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async updatePassword(userId: string, newHashedPassword: string) {
    await this.usersRepo.update(userId, { password: newHashedPassword, mustChangePassword: false });
  }

  async updateProgressStats(userId: string, passed: boolean, score: number) {
    const user = await this.findById(userId);
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.lastSubmissionDate
      ? new Date(user.lastSubmissionDate).toISOString().split('T')[0]
      : null;

    // ── Streak logic (requires a read, so keep as-is) ─────────────────────────
    let newStreak = user.currentStreak;
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak =
        lastDate === yesterday.toISOString().split('T')[0]
          ? user.currentStreak + 1
          : 1;
    }

    // ── Atomic increments: prevents lost-update race when two submissions
    //    for the same student complete simultaneously. ─────────────────────────
    await this.usersRepo.increment({ id: userId }, 'totalAssessments', 1);
    if (passed) {
      await this.usersRepo.increment({ id: userId }, 'totalPassed', 1);
    }

    // ── Re-read the freshly-incremented totals to compute the new average ─────
    const updated = await this.findById(userId);
    if (!updated) return;

    const newAvgScore =
      ((updated.averageScore * (updated.totalAssessments - 1)) + score) /
      updated.totalAssessments;

    await this.usersRepo.update(userId, {
      averageScore:       Math.round(newAvgScore * 100) / 100,
      currentStreak:      newStreak,
      longestStreak:      Math.max(updated.longestStreak, newStreak),
      lastSubmissionDate: new Date(),
    });
  }
}
