// scripts/seed-database.js — Schema initializer and credential seeder for CodeGo
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zH5JYuKmo4XT@ep-plain-darkness-b4wamcs9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

const DEFAULT_USERS = [
  {
    regNumber: 'ADMIN001',
    name: 'Platform Administrator',
    department: 'ADMIN',
    year: 0,
    role: 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@2024',
    mustChangePassword: false,
  },
  {
    regNumber: 'FAC001',
    name: 'Dr. Priya Sharma',
    department: 'CS',
    year: 0,
    role: 'faculty',
    password: process.env.FACULTY_PASSWORD || 'College@2024',
    mustChangePassword: false,
  },
  {
    regNumber: '21CS001',
    name: 'Arun Kumar',
    department: 'CS',
    year: 3,
    role: 'student',
    password: process.env.STUDENT_PASSWORD || 'College@2024',
    mustChangePassword: false,
  },
  {
    regNumber: '21CS002',
    name: 'Priya Sharma',
    department: 'CS',
    year: 3,
    role: 'student',
    password: process.env.STUDENT_PASSWORD || 'College@2024',
    mustChangePassword: false,
  },
  {
    regNumber: '21IT001',
    name: 'Rahul Singh',
    department: 'IT',
    year: 3,
    role: 'student',
    password: process.env.STUDENT_PASSWORD || 'College@2024',
    mustChangePassword: false,
  },
];

const SAMPLE_QUESTIONS = [
  {
    language: 'python',
    difficulty: 'Easy',
    problemStatement: 'Write a program that takes two integers as space-separated input and prints their sum.',
    constraints: '-10^9 <= a, b <= 10^9',
    sampleInput: '4 5',
    sampleOutput: '9',
    testCases: JSON.stringify([
      { input: '4 5', expectedOutput: '9' },
      { input: '-3 8', expectedOutput: '5' },
      { input: '100 200', expectedOutput: '300' },
    ]),
    hints: JSON.stringify(['Use input().split() to read the two numbers', 'Convert each string to int']),
    timeLimitMinutes: 30,
  },
  {
    language: 'javascript',
    difficulty: 'Easy',
    problemStatement: 'Write a program to reverse a given string provided on standard input.',
    constraints: 'String length between 1 and 1000 characters',
    sampleInput: 'hello',
    sampleOutput: 'olleh',
    testCases: JSON.stringify([
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'codego', expectedOutput: 'ogedoc' },
    ]),
    hints: JSON.stringify(['Split string into an array, reverse it, then join']),
    timeLimitMinutes: 30,
  },
  {
    language: 'cpp',
    difficulty: 'Medium',
    problemStatement: 'Given an array of integers, find the maximum element in the array.',
    constraints: '1 <= N <= 10^5, -10^9 <= A[i] <= 10^9',
    sampleInput: '5\n1 9 3 7 2',
    sampleOutput: '9',
    testCases: JSON.stringify([
      { input: '5\n1 9 3 7 2', expectedOutput: '9' },
      { input: '3\n-5 -2 -8', expectedOutput: '-2' },
    ]),
    hints: JSON.stringify(['Track max value while iterating through the elements']),
    timeLimitMinutes: 45,
  },
];

async function seed() {
  console.log('🔄 Connecting to database...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected to PostgreSQL!');

  console.log('📦 Creating tables and enums if not exist...');
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "user_role_enum" AS ENUM('student', 'faculty', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "submission_status_enum" AS ENUM('pending', 'running', 'completed', 'error');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "regNumber" character varying(20) NOT NULL UNIQUE,
      "name" character varying(100) NOT NULL,
      "department" character varying(20) NOT NULL,
      "year" integer NOT NULL,
      "password" character varying NOT NULL,
      "mustChangePassword" boolean NOT NULL DEFAULT true,
      "role" "user_role_enum" NOT NULL DEFAULT 'student',
      "totalAssessments" integer NOT NULL DEFAULT 0,
      "totalPassed" integer NOT NULL DEFAULT 0,
      "averageScore" double precision NOT NULL DEFAULT 0,
      "currentStreak" integer NOT NULL DEFAULT 0,
      "longestStreak" integer NOT NULL DEFAULT 0,
      "lastSubmissionDate" date,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "questions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "language" character varying NOT NULL,
      "difficulty" character varying NOT NULL,
      "problemStatement" text NOT NULL,
      "constraints" text NOT NULL,
      "sampleInput" text NOT NULL,
      "sampleOutput" text NOT NULL,
      "testCases" jsonb NOT NULL,
      "hints" jsonb NOT NULL DEFAULT '[]',
      "timeLimitMinutes" integer NOT NULL DEFAULT 45,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_questions" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "submissions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "questionId" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "code" text NOT NULL,
      "language" character varying NOT NULL,
      "difficulty" character varying NOT NULL,
      "status" "submission_status_enum" NOT NULL DEFAULT 'pending',
      "score" integer NOT NULL DEFAULT 0,
      "passed" boolean NOT NULL DEFAULT false,
      "testsPassed" integer NOT NULL DEFAULT 0,
      "testsTotal" integer NOT NULL DEFAULT 0,
      "gradeResult" jsonb,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_submissions" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "keystroke_windows" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "submissionId" uuid NOT NULL REFERENCES "submissions"("id") ON DELETE CASCADE,
      "windowIndex" integer NOT NULL,
      "featureVector" jsonb NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_keystroke_windows" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "code_deltas" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "submissionId" character varying NOT NULL,
      "sequenceNum" integer NOT NULL,
      "deltaJson" jsonb NOT NULL,
      "timestampMs" bigint NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_code_deltas" PRIMARY KEY ("id")
    );
  `);

  console.log('🔑 Seeding user credentials...');
  for (const user of DEFAULT_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const res = await client.query(
      `INSERT INTO "users" (
        "regNumber", "name", "department", "year",
        "password", "mustChangePassword", "role"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("regNumber") DO UPDATE SET
        "password" = EXCLUDED."password",
        "name" = EXCLUDED."name",
        "role" = EXCLUDED."role",
        "updatedAt" = now()
      RETURNING "id", "regNumber", "name", "role"`,
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
    console.log(`  ✓ [${user.role.toUpperCase()}] ${user.regNumber} (${user.name}) -> Password: "${user.password}"`);
  }

  // Check questions
  const qCount = await client.query(`SELECT count(*)::int as count FROM "questions"`);
  if (qCount.rows[0].count === 0) {
    console.log('📝 Seeding sample questions...');
    for (const q of SAMPLE_QUESTIONS) {
      await client.query(
        `INSERT INTO "questions" (
          "language", "difficulty", "problemStatement",
          "constraints", "sampleInput", "sampleOutput",
          "testCases", "hints", "timeLimitMinutes"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          q.language,
          q.difficulty,
          q.problemStatement,
          q.constraints,
          q.sampleInput,
          q.sampleOutput,
          q.testCases,
          q.hints,
          q.timeLimitMinutes,
        ]
      );
    }
    console.log(`  ✓ Added ${SAMPLE_QUESTIONS.length} starter questions.`);
  } else {
    console.log(`ℹ️ Questions table already has ${qCount.rows[0].count} questions.`);
  }

  await client.end();
  console.log('\n🎉 Database setup and seeding complete!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
