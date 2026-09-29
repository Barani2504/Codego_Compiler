import Redis, { RedisOptions } from 'ioredis';

const UPSTASH_DEFAULT_URL =
  'rediss://default:gQAAAAAABMPSAAIgcDI4OGU5MDIwZjI2MGI0MzNiODBmYzY3NWUwYWQ4OTBiYw@casual-dolphin-312274.upstash.io:6379';

export interface RedisConfigResult {
  url?: string;
  options: RedisOptions;
}

export function getRedisConfig(): RedisConfigResult {
  const isCloudEnvironment = Boolean(
    process.env.RENDER ||
    process.env.IS_PULL_REQUEST ||
    process.env.NODE_ENV === 'production'
  );

  let redisUrl = process.env.REDIS_URL;
  if (!redisUrl && isCloudEnvironment) {
    console.log('☁️ Cloud deployment detected without REDIS_URL: Auto-connecting to Upstash Redis.');
    redisUrl = UPSTASH_DEFAULT_URL;
  }

  const redisHost = process.env.REDIS_HOST;
  const isUpstash = Boolean(
    (redisUrl && redisUrl.includes('upstash.io')) ||
    (redisHost && redisHost.includes('upstash.io'))
  );
  const useTls = process.env.REDIS_TLS === 'true' || isUpstash;

  if (redisUrl) {
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
    ...(options.tls || extraOptions?.tls
      ? { tls: { rejectUnauthorized: false, ...options.tls, ...extraOptions?.tls } }
      : {}),
  };

  if (url) {
    return new Redis(url, mergedOptions);
  }
  return new Redis(mergedOptions);
}
