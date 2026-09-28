import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { createRedisClient } from './redis-config.util';

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
        const client = createRedisClient({
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: true,
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
