const NEON_DEFAULT_URL =
  'postgresql://neondb_owner:npg_zH5JYuKmo4XT@ep-plain-darkness-b4wamcs9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

export function getDatabaseConfig() {
  const isCloudEnvironment = Boolean(
    process.env.RENDER ||
    process.env.IS_PULL_REQUEST ||
    process.env.NODE_ENV === 'production'
  );

  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && isCloudEnvironment) {
    console.log('☁️ Cloud deployment detected without DATABASE_URL: Auto-connecting to Neon PostgreSQL.');
    dbUrl = NEON_DEFAULT_URL;
  }

  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      const host = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      const username = decodeURIComponent(parsed.username);
      const password = decodeURIComponent(parsed.password);
      const database = parsed.pathname.replace(/^\//, '');

      console.log(`📦 Database: Configured -> ${username}@${host}:${port}/${database} (SSL enabled)`);
      return {
        type: 'postgres' as const,
        host,
        port,
        username,
        password,
        database,
        ssl: { rejectUnauthorized: false },
        extra: {
          ssl: { rejectUnauthorized: false },
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 10000,
        },
      };
    } catch (err: any) {
      console.warn(`⚠️ Failed to parse DATABASE_URL as URL, passing directly: ${err.message}`);
      return {
        type: 'postgres' as const,
        url: dbUrl,
        ssl: { rejectUnauthorized: false },
        extra: {
          ssl: { rejectUnauthorized: false },
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 10000,
        },
      };
    }
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const username = process.env.DB_USER || 'platform_user';
  const password = process.env.DB_PASS || 'yourpassword';
  const database = process.env.DB_NAME || 'coding_platform';
  const isProd = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true';

  console.warn(`⚠️ Local fallback: ${username}@${host}:${port}/${database}`);
  return {
    type: 'postgres' as const,
    host,
    port,
    username,
    password,
    database,
    ssl: isProd ? { rejectUnauthorized: false } : false,
    extra: {
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ...(isProd ? { ssl: { rejectUnauthorized: false } } : {}),
    },
  };
}
