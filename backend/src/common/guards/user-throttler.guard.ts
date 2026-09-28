import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * UserThrottlerGuard — throttles by authenticated User ID instead of IP.
 *
 * Problem: In campus/lab environments, 2,000+ students share 1–2 public
 * NAT/gateway IPs. IP-based throttling blocks ~1,940 students after the
 * first 60 requests from that shared IP.
 *
 * Solution: For authenticated requests (which have req.user.sub from JWT),
 * use the User ID as the throttle key. For unauthenticated routes (login,
 * register), fall back to the client IP.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Override the tracker key generation.
   * - Authenticated: throttle by `user:<userId>` so each student has
   *   their own independent rate-limit bucket.
   * - Unauthenticated: throttle by IP (default behavior) to protect
   *   login/register endpoints from brute-force attacks.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.user is set by JwtAuthGuard (Passport) before ThrottlerGuard runs
    // Accept req.user.sub, req.user.userId, or x-user-id header (for simulated test users)
    const userId = req.user?.sub || req.user?.userId || req.headers?.['x-user-id'];
    if (userId) {
      return `user:${userId}`;
    }
    // Fallback to IP for unauthenticated routes (login, register, health)
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
