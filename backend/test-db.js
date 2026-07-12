const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: '127.0.0.1',
    port: 6432,
    user: 'platform_user',
    password: 'strongpassword123',
    database: 'coding_platform',
  });
  
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT 1 as val');
    console.log('Query result:', res.rows);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

test();
