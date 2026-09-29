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
  // ── Python ─────────────────────────────────────────────────────────
  {
    language: 'python',
    difficulty: 'easy',
    problemStatement: 'Write a Python program that takes two integers as space-separated input and prints their sum.',
    constraints: '-10^9 <= a, b <= 10^9',
    sampleInput: '4 5',
    sampleOutput: '9',
    testCases: JSON.stringify([
      { input: '4 5', expectedOutput: '9' },
      { input: '-3 8', expectedOutput: '5' },
      { input: '100 200', expectedOutput: '300' },
      { input: '0 0', expectedOutput: '0' },
    ]),
    hints: JSON.stringify(['Use input().split() to read the two numbers', 'Convert each string to int']),
    timeLimitMinutes: 20,
  },
  {
    language: 'python',
    difficulty: 'medium',
    problemStatement: 'Given a string, determine if it is a palindrome, ignoring non-alphanumeric characters and case.',
    constraints: '1 <= len(s) <= 10^5',
    sampleInput: 'A man, a plan, a canal: Panama',
    sampleOutput: 'true',
    testCases: JSON.stringify([
      { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
      { input: 'race a car', expectedOutput: 'false' },
      { input: ' ', expectedOutput: 'true' },
    ]),
    hints: JSON.stringify(['Filter alphanumeric characters using isalnum()', 'Compare string to its reverse']),
    timeLimitMinutes: 30,
  },
  {
    language: 'python',
    difficulty: 'hard',
    problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    constraints: '2 <= nums.length <= 10^4',
    sampleInput: '4\n2 7 11 15\n9',
    sampleOutput: '0 1',
    testCases: JSON.stringify([
      { input: '4\n2 7 11 15\n9', expectedOutput: '0 1' },
      { input: '3\n3 2 4\n6', expectedOutput: '1 2' },
      { input: '2\n3 3\n6', expectedOutput: '0 1' },
    ]),
    hints: JSON.stringify(['Use a hash map to look up complements in O(1) time']),
    timeLimitMinutes: 45,
  },

  // ── JavaScript ─────────────────────────────────────────────────────
  {
    language: 'javascript',
    difficulty: 'easy',
    problemStatement: 'Write a JavaScript program that reads a string from standard input and prints the string reversed.',
    constraints: '1 <= length <= 1000',
    sampleInput: 'hello',
    sampleOutput: 'olleh',
    testCases: JSON.stringify([
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'CodeGo', expectedOutput: 'oGedoC' },
      { input: 'a', expectedOutput: 'a' },
    ]),
    hints: JSON.stringify(['Use str.split("").reverse().join("")']),
    timeLimitMinutes: 20,
  },
  {
    language: 'javascript',
    difficulty: 'medium',
    problemStatement: 'Given an array of integers, print the second largest element in the array.',
    constraints: '2 <= N <= 10^5',
    sampleInput: '5\n10 5 20 8 12',
    sampleOutput: '12',
    testCases: JSON.stringify([
      { input: '5\n10 5 20 8 12', expectedOutput: '12' },
      { input: '3\n1 2 3', expectedOutput: '2' },
      { input: '4\n-1 -5 -2 -3', expectedOutput: '-2' },
    ]),
    hints: JSON.stringify(['Sort unique elements descending or track max and secondMax in a single pass']),
    timeLimitMinutes: 30,
  },
  {
    language: 'javascript',
    difficulty: 'hard',
    problemStatement: 'Determine if a given string of brackets ((), {}, []) is balanced and valid.',
    constraints: '1 <= length <= 10^4',
    sampleInput: '{[()]}',
    sampleOutput: 'valid',
    testCases: JSON.stringify([
      { input: '{[()]}', expectedOutput: 'valid' },
      { input: '{[(])}', expectedOutput: 'invalid' },
      { input: '((()', expectedOutput: 'invalid' },
    ]),
    hints: JSON.stringify(['Use a stack to match opening brackets with closing brackets']),
    timeLimitMinutes: 45,
  },

  // ── Java ───────────────────────────────────────────────────────────
  {
    language: 'java',
    difficulty: 'easy',
    problemStatement: 'Write a Java program that reads an integer N followed by N integers and prints their sum.',
    constraints: '1 <= N <= 10^4',
    sampleInput: '3\n1 2 3',
    sampleOutput: '6',
    testCases: JSON.stringify([
      { input: '3\n1 2 3', expectedOutput: '6' },
      { input: '4\n10 20 30 40', expectedOutput: '100' },
      { input: '1\n5', expectedOutput: '5' },
    ]),
    hints: JSON.stringify(['Use java.util.Scanner to read input and loop to accumulate']),
    timeLimitMinutes: 20,
  },
  {
    language: 'java',
    difficulty: 'medium',
    problemStatement: 'Write a Java program to count the number of vowels (a, e, i, o, u case-insensitive) in a given string.',
    constraints: '1 <= length <= 10^5',
    sampleInput: 'Hello World',
    sampleOutput: '3',
    testCases: JSON.stringify([
      { input: 'Hello World', expectedOutput: '3' },
      { input: 'AEIOU', expectedOutput: '5' },
      { input: 'xyz', expectedOutput: '0' },
    ]),
    hints: JSON.stringify(['Convert string to lowercase and inspect each character']),
    timeLimitMinutes: 30,
  },
  {
    language: 'java',
    difficulty: 'hard',
    problemStatement: 'Given an array of integers, find the maximum sum of a contiguous subarray (Kadane\'s Algorithm).',
    constraints: '1 <= N <= 10^5, -10^4 <= A[i] <= 10^4',
    sampleInput: '8\n-2 1 -3 4 -1 2 1 -5',
    sampleOutput: '6',
    testCases: JSON.stringify([
      { input: '8\n-2 1 -3 4 -1 2 1 -5', expectedOutput: '6' },
      { input: '1\n1', expectedOutput: '1' },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23' },
    ]),
    hints: JSON.stringify(['Track maxEndingHere and maxSoFar as you iterate through the array']),
    timeLimitMinutes: 45,
  },

  // ── C / C++ ────────────────────────────────────────────────────────
  {
    language: 'c',
    difficulty: 'easy',
    problemStatement: 'Write a C program that calculates the factorial of a non-negative integer N (0 <= N <= 12).',
    constraints: '0 <= N <= 12',
    sampleInput: '5',
    sampleOutput: '120',
    testCases: JSON.stringify([
      { input: '5', expectedOutput: '120' },
      { input: '0', expectedOutput: '1' },
      { input: '1', expectedOutput: '1' },
      { input: '6', expectedOutput: '720' },
    ]),
    hints: JSON.stringify(['Factorial of 0 is 1. Use a loop from 1 to N.']),
    timeLimitMinutes: 20,
  },
  {
    language: 'c',
    difficulty: 'medium',
    problemStatement: 'Write a C program to check whether a given integer N is a prime number. Print "Prime" or "Not Prime".',
    constraints: '1 <= N <= 10^9',
    sampleInput: '7',
    sampleOutput: 'Prime',
    testCases: JSON.stringify([
      { input: '7', expectedOutput: 'Prime' },
      { input: '4', expectedOutput: 'Not Prime' },
      { input: '1', expectedOutput: 'Not Prime' },
      { input: '13', expectedOutput: 'Prime' },
    ]),
    hints: JSON.stringify(['Check divisibility up to sqrt(N)']),
    timeLimitMinutes: 30,
  },
  {
    language: 'c',
    difficulty: 'hard',
    problemStatement: 'Write a C program to reverse an array of N integers in place and print the result space-separated.',
    constraints: '1 <= N <= 10^5',
    sampleInput: '5\n1 2 3 4 5',
    sampleOutput: '5 4 3 2 1',
    testCases: JSON.stringify([
      { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1' },
      { input: '3\n10 20 30', expectedOutput: '30 20 10' },
      { input: '1\n99', expectedOutput: '99' },
    ]),
    hints: JSON.stringify(['Use two pointers: one at start, one at end, swap until they meet']),
    timeLimitMinutes: 45,
  },
  {
    language: 'cpp',
    difficulty: 'easy',
    problemStatement: 'Write a C++ program that reads N integers and prints the maximum value.',
    constraints: '1 <= N <= 10^5',
    sampleInput: '5\n1 9 3 7 2',
    sampleOutput: '9',
    testCases: JSON.stringify([
      { input: '5\n1 9 3 7 2', expectedOutput: '9' },
      { input: '3\n-5 -2 -8', expectedOutput: '-2' },
      { input: '1\n42', expectedOutput: '42' },
    ]),
    hints: JSON.stringify(['Use std::max or track maximum while reading values']),
    timeLimitMinutes: 20,
  },
  {
    language: 'cpp',
    difficulty: 'medium',
    problemStatement: 'Given an array of integers, remove duplicates from the array and print the unique elements in sorted order.',
    constraints: '1 <= N <= 10^5',
    sampleInput: '6\n4 2 1 2 4 3',
    sampleOutput: '1 2 3 4',
    testCases: JSON.stringify([
      { input: '6\n4 2 1 2 4 3', expectedOutput: '1 2 3 4' },
      { input: '4\n5 5 5 5', expectedOutput: '5' },
    ]),
    hints: JSON.stringify(['Use std::set or sort and use std::unique']),
    timeLimitMinutes: 30,
  },
  {
    language: 'cpp',
    difficulty: 'hard',
    problemStatement: 'Given two sorted arrays of integers, merge them into a single sorted array and print space-separated.',
    constraints: '1 <= N, M <= 10^5',
    sampleInput: '3 3\n1 3 5\n2 4 6',
    sampleOutput: '1 2 3 4 5 6',
    testCases: JSON.stringify([
      { input: '3 3\n1 3 5\n2 4 6', expectedOutput: '1 2 3 4 5 6' },
      { input: '2 3\n1 10\n2 3 4', expectedOutput: '1 2 3 4 10' },
    ]),
    hints: JSON.stringify(['Use the two-pointer merge step from merge sort']),
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

  console.log('📦 Ensuring tables exist...');
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

  console.log('🔑 Seeding user credentials...');
  for (const user of DEFAULT_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await client.query(
      `INSERT INTO "users" (
        "regNumber", "name", "department", "year",
        "password", "mustChangePassword", "role"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("regNumber") DO UPDATE SET
        "password" = EXCLUDED."password",
        "name" = EXCLUDED."name",
        "role" = EXCLUDED."role",
        "updatedAt" = now()`,
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
    console.log(`  ✓ [${user.role.toUpperCase()}] ${user.regNumber} (${user.name})`);
  }

  console.log('📝 Seeding questions for all languages (python, js, java, c, cpp)...');
  // Clear and re-populate questions table with full library
  await client.query(`DELETE FROM "questions"`);
  for (const q of SAMPLE_QUESTIONS) {
    await client.query(
      `INSERT INTO "questions" (
        "language", "difficulty", "problemStatement",
        "constraints", "sampleInput", "sampleOutput",
        "testCases", "hints", "timeLimitMinutes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        q.language.toLowerCase(),
        q.difficulty.toLowerCase(),
        q.problemStatement,
        q.constraints,
        q.sampleInput,
        q.sampleOutput,
        q.testCases,
        q.hints,
        q.timeLimitMinutes,
      ]
    );
    console.log(`  ✓ Added question: [${q.language.toUpperCase()}] [${q.difficulty}] - ${q.problemStatement.slice(0, 45)}...`);
  }

  await client.end();
  console.log(`\n🎉 Seeded ${SAMPLE_QUESTIONS.length} questions across Python, JavaScript, Java, C, and C++!`);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
