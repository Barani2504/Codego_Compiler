import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Injection token for the shared ioredis client.
 * Import REDIS_CLIENT in any provider that needs direct Redis access.
 *
 * Usage:
 *   constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global() // Registered once in AppModule; available everywhere without re-importing
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        // Only send AUTH when REDIS_PASSWORD is actually configured.
        // Sending a placeholder/empty string to a no-auth Redis causes
        // "NOAUTH Authentication required" which ioredis retries in a tight loop.
        const redisPassword = process.env.REDIS_PASSWORD || '';
        const redisTLS = process.env.REDIS_TLS === 'true';
        const client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          ...(redisPassword ? { password: redisPassword } : {}),
          // Upstash requires TLS — enabled via REDIS_TLS=true in production
          ...(redisTLS ? { tls: {} } : {}),
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: true, // Don't block startup if Redis is briefly unavailable
        });
        client.on('error', (err) =>
          console.error('[RedisClient] Connection error:', err.message),
        );
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
