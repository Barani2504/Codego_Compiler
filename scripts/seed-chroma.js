#!/usr/bin/env node
/**
 * scripts/seed-chroma.js
 *
 * One-time seeding script: parses fine_tuning_dataset_clean.jsonl
 * (29,000 questions) and bulk-inserts them into the ChromaDB
 * 'coding_questions' collection, which is queried by questions.service.ts
 * for super-fast RAG-based question generation.
 *
 * Usage:
 *   node scripts/seed-chroma.js
 *
 * Requires ChromaDB to be running (docker compose up -d chroma).
 * ChromaDB URL defaults to http://localhost:8000 (set CHROMA_URL to override).
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { ChromaClient } = require('../backend/node_modules/chromadb');

const CHROMA_URL = process.env.CHROMA_URL || 'http://127.0.0.1:8000';
const COLLECTION_NAME = 'coding_questions';
const JSONL_PATH = path.join(__dirname, 'fine_tuning_dataset_clean.jsonl');
const BATCH_SIZE = 100;

const LANG_MAP = {
  'CPP': 'cpp', 'C++': 'cpp', 'C': 'c',
  'PYTHON': 'python', 'JAVA': 'java',
  'JAVASCRIPT': 'javascript', 'JS': 'javascript',
  'R': 'r',
};

const DIFF_MAP = {
  'EASY': 'easy', 'MEDIUM': 'medium', 'HARD': 'hard',
};

function extractLangAndDiff(userContent) {
  const langMatch = userContent.match(/LANGUAGE:\s*([A-Z+]+)/i);
  const diffMatch = userContent.match(/DIFFICULTY:\s*(EASY|MEDIUM|HARD)/i);
  const rawLang = langMatch ? langMatch[1].toUpperCase() : null;
  const rawDiff = diffMatch ? diffMatch[1].toUpperCase() : null;
  return {
    language: LANG_MAP[rawLang] ?? rawLang?.toLowerCase() ?? 'unknown',
    difficulty: DIFF_MAP[rawDiff] ?? rawDiff?.toLowerCase() ?? 'medium',
  };
}

/**
 * Parse an assert.deepEqual(candidate(args), expected) assertion string.
 * Returns { input: JSON.stringify(args), expectedOutput: JSON.stringify(expected) }
 * or null if parsing fails.
 */
function parseJsAssertion(assertionStr) {
  // Match: assert.deepEqual(candidate(ARGS), EXPECTED);
  const m = assertionStr.match(/assert\.deepEqual\s*\(\s*candidate\s*\((.*)\)\s*,\s*(.+?)\s*\)\s*;?\s*$/);
  if (!m) return null;
  const argsStr = m[1].trim();
  const expectedStr = m[2].trim();
  try {
    // Parse expected value
    const expected = JSON.parse(expectedStr);
    // argsStr may be a single value or comma-separated values
    // Wrap in array brackets and parse as JSON array
    const argsArr = JSON.parse('[' + argsStr + ']');
    return {
      // input is a JSON array of arguments (the runner will spread them)
      input: JSON.stringify(argsArr),
      expectedOutput: JSON.stringify(expected),
    };
  } catch {
    return null;
  }
}

function extractQuestionData(assistantContent, language) {
  const start = assistantContent.indexOf('{');
  const end = assistantContent.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(assistantContent.substring(start, end + 1));
    if (!parsed.problemStatement || !Array.isArray(parsed.testCases) || parsed.testCases.length === 0) return null;

    // For JavaScript: test cases use assert.deepEqual(candidate(...), ...) style
    // Convert them to proper input/expectedOutput pairs
    if (language === 'javascript') {
      const converted = [];
      for (const tc of parsed.testCases) {
        const out = tc.expectedOutput || tc.output || '';
        // Skip the require() line (Assertion 1)
        if (out.includes("require(") || out.trim() === '') continue;
        const parsed2 = parseJsAssertion(out);
        if (parsed2) converted.push(parsed2);
      }
      if (converted.length > 0) {
        parsed.testCases = converted;
        // Generate sampleInput/Output from first test case
        parsed.sampleInput = converted[0].input;
        parsed.sampleOutput = converted[0].expectedOutput;
      } else {
        // No parseable assertions — skip this question
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

const dummyEmbeddingFunction = {
  generate: async (texts) => {
    return texts.map(() => [0.1, 0.2]);
  }
};

async function getOrCreateCollection(client) {
  try {
    return await client.getOrCreateCollection({ 
      name: COLLECTION_NAME,
      embeddingFunction: dummyEmbeddingFunction 
    });
  } catch (err) {
    console.log(`Error getting/creating collection: ${err.message}`);
    throw err;
  }
}

async function upsertBatch(collection, batch) {
  await collection.upsert({
    ids: batch.map(b => b.id),
    embeddings: batch.map(b => [0.1, 0.2]),
    documents: batch.map(b => b.document),
    metadatas: batch.map(b => b.metadata),
  });
}

async function main() {
  console.log(`\n🚀 CodeGoAI ChromaDB Seeder`);
  console.log(`   Source: ${JSONL_PATH}`);
  console.log(`   Target: ${CHROMA_URL}\n`);

  if (!fs.existsSync(JSONL_PATH)) {
    console.error(`✗ Dataset not found: ${JSONL_PATH}`);
    process.exit(1);
  }

  const client = new ChromaClient({ path: CHROMA_URL });

  try {
    await client.heartbeat();
    console.log('✓ ChromaDB is reachable\n');
  } catch (err) {
    console.error(`✗ Cannot reach ChromaDB at ${CHROMA_URL}: ${err.message}`);
    console.error('  Make sure Docker is running: docker compose up -d chroma');
    process.exit(1);
  }

  const collection = await getOrCreateCollection(client);

  const rl = readline.createInterface({
    input: fs.createReadStream(JSONL_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let valid = 0;
  let skipped = 0;
  let batch = [];
  let totalBatches = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await upsertBatch(collection, batch);
    totalBatches++;
    process.stdout.write(`\r  Inserted ${valid} questions (${skipped} skipped)...`);
    batch = [];
  };

  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch {
      skipped++;
      continue;
    }

    const messages = record.messages;
    if (!Array.isArray(messages) || messages.length < 3) { skipped++; continue; }

    const userMsg = messages.find(m => m.role === 'user');
    const assistantMsg = messages.find(m => m.role === 'assistant');
    if (!userMsg || !assistantMsg) { skipped++; continue; }

    const { language, difficulty } = extractLangAndDiff(userMsg.content || '');
    if (language === 'unknown') { skipped++; continue; }

    const qData = extractQuestionData(assistantMsg.content || '', language);
    if (!qData) { skipped++; continue; }

    const id = `q_${lineNum}`;
    const document = JSON.stringify({
      problemStatement: qData.problemStatement,
      constraints: qData.constraints || 'None',
      sampleInput: qData.sampleInput || '',
      sampleOutput: qData.sampleOutput || '',
      testCases: qData.testCases,
      hints: Array.isArray(qData.hints) ? qData.hints : [
        'Read the problem constraints carefully.',
        'Trace through the sample input by hand.',
        'Consider edge cases.',
      ],
      timeLimitMinutes: qData.timeLimitMinutes ?? (difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 45),
    });

    batch.push({
      id,
      document,
      metadata: { language, difficulty },
    });
    valid++;

    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }

  await flush();

  console.log(`\n\n✅ Done! Seeded ${valid} questions into ChromaDB.`);
  console.log(`   Skipped: ${skipped} malformed/incomplete records`);
  console.log(`   Batches: ${totalBatches}`);
  
  try {
    const count = await collection.count();
    console.log(`   Total documents in collection: ${count} (collection ready)`);
  } catch (e) {
    console.log(`   Total documents in collection: ~${valid} (collection ready)`);
  }
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
