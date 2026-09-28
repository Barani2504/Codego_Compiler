import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from backend/.env if available
function loadEnv() {
  const envPath = path.resolve(__dirname, '../backend/.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

// Resolve pg and bcrypt from backend/node_modules or root
function getModule(name: string) {
  try {
    return require(name);
  } catch {
    return require(path.resolve(__dirname, `../backend/node_modules/${name}`));
  }
}

const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || 'College@2024';

const defaultUsers = [
  // Faculty
  {
    regNumber: 'FAC001',
    name: 'Dr. Priya Sharma',
    department: 'CS',
    year: 0,
    role: 'faculty',
    mustChangePassword: false,
  },
  // Students
  {
    regNumber: '21CS001',
    name: 'Arun Kumar',
    department: 'CS',
    year: 3,
    role: 'student',
    mustChangePassword: false,
  },
  {
    regNumber: '21CS002',
    name: 'Priya Sharma',
    department: 'CS',
    year: 3,
    role: 'student',
    mustChangePassword: true,
  },
  {
    regNumber: '21IT001',
    name: 'Rahul Singh',
    department: 'IT',
    year: 3,
    role: 'student',
    mustChangePassword: true,
  },
];

async function seedDirectly() {
  const { Client } = getModule('pg');
  const bcrypt = getModule('bcrypt');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'platform_user',
    password: process.env.DB_PASS || 'your_secure_password',
    database: process.env.DB_NAME || 'coding_platform',
  });

  await client.connect();

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of defaultUsers) {
    try {
      const existing = await client.query(
        'SELECT id FROM users WHERE "regNumber" = $1',
        [user.regNumber]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO users (
          "regNumber", "name", "department", "year",
          "password", "mustChangePassword", "role",
          "totalAssessments", "totalPassed", "averageScore",
          "currentStreak", "longestStreak", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, 0, NOW(), NOW()
        )`,
        [
          user.regNumber,
          user.name,
          user.department,
          user.year,
          hashedPassword,
          user.mustChangePassword,
          user.role,
        ]
      );
      imported++;
    } catch (err: any) {
      errors.push(`${user.regNumber}: ${err.message}`);
    }
  }

  await client.end();

  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  console.log('\nDefault accounts ready:');
  console.log(`  Student: 21CS001 / ${defaultPassword}`);
  console.log(`  Faculty: FAC001 / ${defaultPassword}`);
}

async function main() {
  // If explicitly requested to use API and token is present
  if (process.env.USE_API === 'true' && process.env.ADMIN_JWT_TOKEN) {
    try {
      const response = await fetch('http://localhost:3000/api/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_JWT_TOKEN}`,
        },
        body: JSON.stringify({
          students: defaultUsers.filter(u => u.role === 'student'),
          defaultPassword,
        }),
      });

      const result = await response.json() as any;
      console.log(`Imported: ${result.imported ?? 0}`);
      console.log(`Skipped: ${result.skipped ?? 0}`);
      if (result.errors?.length > 0) console.log('Errors:', result.errors);
      return;
    } catch (err: any) {
      console.warn(`API import failed: ${err.message}, falling back to direct database seed...`);
    }
  }

  await seedDirectly();
}

main().catch(console.error);
