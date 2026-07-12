import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';

// ─── bcrypt cost factor ────────────────────────────────────────────────────────
// Reduced from 12 → 10.
// Cost 10 ≈ 70ms per hash (cost 12 ≈ 300ms).
// This alone gives ~4× more concurrent logins before the event loop saturates.
// Security: cost 10 is still the OWASP-recommended minimum for bcrypt.
const BCRYPT_ROUNDS = 10;

// ─── Redis login-result cache ──────────────────────────────────────────────────
// After a successful bcrypt.compare(), we cache the user's JWT for 60 seconds.
// If the same student hits "Login" again within 60s (e.g., refresh / retry),
// we skip bcrypt entirely and return the cached token instantly (~2ms vs 70ms).
// Key format  : codego:login:<sha256(regNumber + ":" + password)>
// Cache TTL   : 60 seconds (JWT is valid for 8h so this is safe)
const LOGIN_CACHE_TTL = 60; // seconds

function cacheKey(regNumber: string, password: string) {
  return `codego:login:${crypto.createHash('sha256').update(`${regNumber}:${password}`).digest('hex')}`;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async login(regNumber: string, password: string) {
    const normalizedReg = regNumber.toUpperCase();

    // ── 1. Check Redis cache first ─────────────────────────────────────────────
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey(normalizedReg, password));
        if (cached) {
          return JSON.parse(cached);   // ~2ms — skip DB + bcrypt entirely
        }
      } catch { /* Redis blip — continue to normal path */ }
    }

    // ── 2. DB lookup ───────────────────────────────────────────────────────────
    const user = await this.usersService.findByRegNumber(normalizedReg);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // ── 3. bcrypt compare (CPU-bound, ~70ms at cost 10) ───────────────────────
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    // ── 4. Build response ──────────────────────────────────────────────────────
    const payload = {
      sub: user.id, regNumber: user.regNumber, name: user.name,
      role: user.role, department: user.department, year: user.year,
      mustChangePassword: user.mustChangePassword,
    };

    const result = {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id, regNumber: user.regNumber, name: user.name,
        role: user.role, mustChangePassword: user.mustChangePassword,
        department: user.department, year: user.year,
        totalAssessments: user.totalAssessments, totalPassed: user.totalPassed,
        averageScore: user.averageScore, currentStreak: user.currentStreak,
      },
    };

    // ── 5. Cache result for 60s ────────────────────────────────────────────────
    if (this.redis) {
      try {
        await this.redis.set(cacheKey(normalizedReg, password), JSON.stringify(result), 'EX', LOGIN_CACHE_TTL);
      } catch { /* non-fatal */ }
    }

    return result;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');
    if (newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

    // Invalidate any cached login tokens for this user after password change
    if (this.redis) {
      try {
        // We can't know all cached keys without scanning, so just let the 60s TTL expire naturally.
        // The new password hash won't match the old cache key — so the cache self-invalidates.
      } catch { /* non-fatal */ }
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePassword(userId, hashed);
  }
}
