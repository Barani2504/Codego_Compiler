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

function getModule(name: string) {
  try {
    return require(name);
  } catch {
    return require(path.resolve(__dirname, `../backend/node_modules/${name}`));
  }
}

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

// Match backend/src/questions/questions.service.ts dummy embedding function
const dummyEmbeddingFunction = {
  generate: async (texts: string[]) => texts.map(() => [0.1, 0.2]),
};

interface SeedQuestion {
  language: string;
  difficulty: string;
  problemStatement: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  testCases: { input: string; expectedOutput: string }[];
  hints: string[];
  timeLimitMinutes?: number;
}

async function seedPostgres(questions: SeedQuestion[]) {
  const { Client } = getModule('pg');
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'platform_user',
    password: process.env.DB_PASS || 'your_secure_password',
    database: process.env.DB_NAME || 'coding_platform',
  });

  try {
    await client.connect();
    let inserted = 0;
    let skipped = 0;

    for (const q of questions) {
      const existing = await client.query(
        'SELECT id FROM questions WHERE language = $1 AND "problemStatement" = $2',
        [q.language, q.problemStatement]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO questions (
          language, difficulty, "problemStatement", constraints,
          "sampleInput", "sampleOutput", "testCases", hints,
          "timeLimitMinutes", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )`,
        [
          q.language,
          q.difficulty,
          q.problemStatement,
          q.constraints || 'None',
          q.sampleInput || '',
          q.sampleOutput || '',
          JSON.stringify(q.testCases || []),
          JSON.stringify(q.hints || []),
          q.timeLimitMinutes ?? (q.difficulty === 'easy' ? 15 : q.difficulty === 'medium' ? 30 : 45),
        ]
      );
      inserted++;
    }

    await client.end();
    console.log(`  ✓ PostgreSQL: ${inserted} questions inserted, ${skipped} skipped (already present)`);
  } catch (err: any) {
    console.warn(`  ! PostgreSQL seed notice: ${err.message}`);
  }
}

async function seed() {
  const { ChromaClient } = getModule('chromadb');

  // Parse Chroma host and port to avoid deprecation warning
  let host = '127.0.0.1';
  let port = 8000;
  let ssl = false;
  try {
    const url = new URL(CHROMA_URL.replace('localhost', '127.0.0.1'));
    host = url.hostname;
    port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
    ssl = url.protocol === 'https:';
  } catch {
    // fallback
  }

  const client = new ChromaClient({ host, port, ssl });

  console.log(`\nConnecting to ChromaDB at ${host}:${port}...`);
  try {
    await client.heartbeat();
    console.log('✓ ChromaDB connection established');
  } catch (err: any) {
    console.error(`✗ Cannot reach ChromaDB: ${err.message}`);
    console.error('  Make sure ChromaDB is running: docker compose up -d chroma');
    process.exit(1);
  }

  const collection = await client.getOrCreateCollection({
    name: 'coding_questions',
    embeddingFunction: dummyEmbeddingFunction,
  });

  const dataPath = path.join(__dirname, 'seed-data.json');
  const questions: SeedQuestion[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`Seeding ${questions.length} verified questions across Python, C, C++, Java, JavaScript...`);

  let chromaCount = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = `seed-${q.language}-${q.difficulty}-${i}`;
    const fullJson = JSON.stringify({
      problemStatement: q.problemStatement,
      constraints: q.constraints || 'None',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      testCases: q.testCases,
      hints: q.hints || [],
      timeLimitMinutes: q.timeLimitMinutes ?? (q.difficulty === 'easy' ? 15 : q.difficulty === 'medium' ? 30 : 45),
    });

    try {
      await collection.upsert({
        ids: [id],
        documents: [fullJson],
        embeddings: [[0.1, 0.2]],
        metadatas: [{ language: q.language, difficulty: q.difficulty }],
      });
      chromaCount++;
    } catch (e: any) {
      console.error(`  ✗ Chroma upsert failed for ${id}: ${e.message}`);
    }
  }

  console.log(`  ✓ ChromaDB: ${chromaCount} questions seeded into 'coding_questions'`);

  console.log('Seeding PostgreSQL fallback table...');
  await seedPostgres(questions);

  const totalInCollection = await collection.count();
  console.log(`\nSeed complete. Total: ${totalInCollection} questions in ChromaDB collection 'coding_questions'.`);
}

seed().catch(console.error);
