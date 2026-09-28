import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfigResult {
  url?: string;
  options: RedisOptions;
}

export function getRedisConfig(): RedisConfigResult {
  let redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const isUpstash = Boolean(
    (redisUrl && redisUrl.includes('upstash.io')) ||
    (redisHost && redisHost.includes('upstash.io'))
  );
  const useTls = process.env.REDIS_TLS === 'true' || isUpstash;

  if (redisUrl) {
    // Upstash requires rediss:// or tls for encrypted connection
    if (useTls && redisUrl.startsWith('redis://')) {
      redisUrl = redisUrl.replace('redis://', 'rediss://');
    }
    return {
      url: redisUrl,
      options: {
        ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
        enableReadyCheck: false,
      },
    };
  }

  const redisPassword = process.env.REDIS_PASSWORD || '';
  return {
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ...(redisPassword ? { password: redisPassword } : {}),
      ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
      enableReadyCheck: false,
    },
  };
}

export function createRedisClient(extraOptions?: RedisOptions): Redis {
  const { url, options } = getRedisConfig();
  const mergedOptions: RedisOptions = {
    ...options,
    ...extraOptions,
    ...(options.tls || extraOptions?.tls ? { tls: { rejectUnauthorized: false, ...options.tls, ...extraOptions?.tls } } : {}),
  };

  if (url) {
    return new Redis(url, mergedOptions);
  }
  return new Redis(mergedOptions);
}
