import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async bulkImport(students: any[], defaultPassword: string) {
    if (!students || students.length === 0) {
      return { imported: 0, skipped: 0, errors: [] };
    }

    // Cost 10 ≈ 70ms — 4× faster than cost 12, still OWASP-recommended minimum
    const hashed = await bcrypt.hash(defaultPassword, 10);
    const errors: string[] = [];

    // Find already existing registration numbers in a single query
    const regNumbers = students.map((s) => s.regNumber).filter(Boolean);
    const existingUsers =
      regNumbers.length > 0
        ? await this.usersRepo
            .createQueryBuilder('u')
            .select('u.regNumber')
            .where('u.regNumber IN (:...regNumbers)', { regNumbers })
            .getMany()
        : [];

    const existingSet = new Set(existingUsers.map((u) => u.regNumber));
    const toInsert = students.filter((s) => {
      if (!s.regNumber) return false;
      return !existingSet.has(s.regNumber);
    });

    const skipped = students.length - toInsert.length;
    let imported = 0;

    if (toInsert.length > 0) {
      // Chunk inserts in batches of 100 to stay well under query parameter limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE).map((s) => ({
          regNumber: s.regNumber,
          name: s.name,
          department: s.department,
          year: s.year,
          password: hashed,
          mustChangePassword: true,
          role: 'student' as any,
        }));

        try {
          await this.usersRepo
            .createQueryBuilder()
            .insert()
            .into(User)
            .values(chunk)
            .orIgnore()
            .execute();
          imported += chunk.length;
        } catch (err: any) {
          errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${err.message}`);
        }
      }
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
    await this.usersRepo.manager.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = user.lastSubmissionDate
        ? new Date(user.lastSubmissionDate).toISOString().split('T')[0]
        : null;

      let newStreak = user.currentStreak;
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        newStreak =
          lastDate === yesterday.toISOString().split('T')[0]
            ? user.currentStreak + 1
            : 1;
      }

      const totalAssessments = (user.totalAssessments || 0) + 1;
      const totalPassed = (user.totalPassed || 0) + (passed ? 1 : 0);
      const newAvgScore =
        (((user.averageScore || 0) * (totalAssessments - 1)) + score) / totalAssessments;

      await manager.getRepository(User).update(userId, {
        totalAssessments,
        totalPassed,
        averageScore: Math.round(newAvgScore * 100) / 100,
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak || 0, newStreak),
        lastSubmissionDate: new Date(),
      });
    });
  }
}
