const Redis = require('ioredis');
require('dotenv').config();

async function clearQueue() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  console.log('Fetching BullMQ keys...');
  const keys = await redis.keys('bull:*');

  if (keys.length === 0) {
    console.log('Queue is already empty.');
  } else {
    console.log(`Found ${keys.length} keys. Deleting...`);
    // DEL accepts variadic args; split into chunks if large
    const chunkSize = 100;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await redis.del(...keys.slice(i, i + chunkSize));
    }
    console.log('✓ Queue cleared.');
  }

  redis.disconnect();
}

clearQueue().catch(console.error);
