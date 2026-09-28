import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Question } from './question.entity';
import { REDIS_CLIENT } from '../common/redis/redis.module';

// ─── ChromaDB HTTP client (no embedding needed — pure metadata store) ─────────
// We store full question JSON as the document, and query by language + difficulty
// metadata filters. This gives us ~O(1) retrieval from 29k seeded questions.
const CHROMA_BATCH = 50; // How many candidates to fetch before random selection

// ─── Helper: clean label noise from raw JSONL sample text ─────────────────────
const LABEL_RE = /^\s*(sample\s*(input|output)?|expected\s*(output|input)?|input|output|stdin|stdout|example)\s*$/i;

function cleanSampleText(raw: string | undefined): string {
  if (!raw) return '';
  let lines = raw.split('\n');
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (last === '' || LABEL_RE.test(last)) lines.pop(); else break;
  }
  while (lines.length > 0) {
    const first = lines[0].trim();
    if (first === '' || LABEL_RE.test(first)) lines.shift(); else break;
  }
  return lines.join('\n').trim();
}

const dummyEmbeddingFunction = {
  generate: async (texts: string[]) => texts.map(() => [0.1, 0.2])
};

// ─── Minimal ChromaDB client via official SDK ───────────────
async function chromaQuery(
  chromaUrl: string,
  collectionName: string,
  language: string,
  difficulty: string,
  limit = CHROMA_BATCH,
): Promise<any[]> {
  let host = '127.0.0.1';
  let port = 8000;
  let ssl = false;
  try {
    const url = new URL(chromaUrl.replace('localhost', '127.0.0.1'));
    host = url.hostname;
    port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
    ssl = url.protocol === 'https:';
  } catch {}
  const client = new ChromaClient({ host, port, ssl });
  
  try {
    const col = await client.getCollection({ 
      name: collectionName,
      embeddingFunction: dummyEmbeddingFunction
    });
    const queryRes = await col.get({
      where: { $and: [{ language: { $eq: language } }, { difficulty: { $eq: difficulty } }] },
      limit,
    });
    return queryRes.documents ?? [];
  } catch (err: any) {
    throw new Error(`ChromaDB query failed: ${err.message}`);
  }
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * Fetch a question by ID with a 1-hour Redis cache.
   * During an exam 2000 students all load the same question — without caching
   * that's 2000 identical Postgres queries. With caching it's one.
   */
  async getQuestion(id: string): Promise<Question | null> {
    const cacheKey = `question:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as Question;

    const question = await this.questionsRepo.findOne({ where: { id } });
    if (question) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(question));
    }
    return question ?? null;
  }

  /**
   * Generate (actually: instantly retrieve) a question by language + difficulty.
   *
   * Strategy:
   *   1. ChromaDB RAG (primary) — fetches up to 50 pre-validated questions that
   *      match language + difficulty, picks one at random. ~5–10ms response.
   *   2. DB fallback — if ChromaDB is empty/unavailable, picks a random question
   *      from the Postgres `questions` table for that lang/difficulty.
   *   3. Error — if neither source has a question, throws a clear exception.
   *
   * Ollama/AI generation has been removed. With 29k seeded questions there is
   * no need to wait 15 minutes for AI — every question is served instantly.
   */
  async generateQuestion(language: string, difficulty: string): Promise<Question> {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';

    // ── 1. ChromaDB RAG — primary source ─────────────────────────────────────
    try {
      const docs = await chromaQuery(chromaUrl, 'coding_questions', language, difficulty);
      const validDocs = docs.filter(d => d !== null) as string[];

      if (validDocs.length > 0) {
        const randomDoc = validDocs[Math.floor(Math.random() * validDocs.length)];
        let qData: any = null;
        try { qData = JSON.parse(randomDoc); } catch { /* not JSON */ }

        if (qData && qData.testCases && Array.isArray(qData.testCases) && qData.testCases.length > 0) {
          this.logger.log(
            `[RAG] ✓ Served ${language}/${difficulty} from ChromaDB (${validDocs.length} available) in ~5ms`,
          );
          const question = this.questionsRepo.create({
            language,
            difficulty,
            problemStatement: qData.problemStatement || 'Problem statement unavailable.',
            constraints: qData.constraints || 'None',
            sampleInput: cleanSampleText(qData.sampleInput),
            sampleOutput: cleanSampleText(qData.sampleOutput),
            testCases: qData.testCases,
            hints: Array.isArray(qData.hints) && qData.hints.length > 0
              ? qData.hints
              : ['Read the problem carefully.', 'Trace the sample input by hand.', 'Consider edge cases.'],
            timeLimitMinutes: qData.timeLimitMinutes
              ?? (difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 45),
          });
          return this.questionsRepo.save(question);
        }
      }

      this.logger.warn(`[RAG] ChromaDB returned 0 valid docs for ${language}/${difficulty}. Falling back to DB.`);
    } catch (err: any) {
      this.logger.warn(`[RAG] ChromaDB unavailable: ${err.message}. Falling back to DB.`);
    }

    // ── 2. Postgres DB fallback — pick a random existing question ─────────────
    // This covers the case before seeding or when ChromaDB is down.
    try {
      const existing = await this.questionsRepo
        .createQueryBuilder('q')
        .where('q.language = :language', { language })
        .andWhere('q.difficulty = :difficulty', { difficulty })
        .orderBy('RANDOM()')
        .limit(1)
        .getOne();

      if (existing) {
        this.logger.log(`[DB-FALLBACK] Served ${language}/${difficulty} from Postgres questions table.`);
        // Clone into a new row so each student gets their own question ID
        const cloned = this.questionsRepo.create({
          language: existing.language,
          difficulty: existing.difficulty,
          problemStatement: existing.problemStatement,
          constraints: existing.constraints,
          sampleInput: existing.sampleInput,
          sampleOutput: existing.sampleOutput,
          testCases: existing.testCases,
          hints: existing.hints,
          timeLimitMinutes: existing.timeLimitMinutes,
        });
        return this.questionsRepo.save(cloned);
      }
    } catch (dbErr: any) {
      this.logger.error(`[DB-FALLBACK] Postgres fallback also failed: ${dbErr.message}`);
    }

    // ── 3. No questions available at all ─────────────────────────────────────
    throw new NotFoundException(
      `No questions available for ${language}/${difficulty}. ` +
      `Please run: node scripts/seed-chroma.js`,
    );
  }

  /**
   * Pre-warm Redis cache with questions from Postgres DB.
   * Eliminates initial DB hit spikes when thousands of students open an assessment simultaneously.
   */
  async prewarmCache(limit = 100): Promise<{ cachedCount: number; keys: string[] }> {
    const questions = await this.questionsRepo.find({
      take: limit,
      order: { id: 'DESC' },
    });

    const pipeline = this.redis.pipeline();
    const cachedKeys: string[] = [];

    for (const q of questions) {
      const key = `question:${q.id}`;
      pipeline.setex(key, 3600, JSON.stringify(q));
      cachedKeys.push(key);
    }

    if (cachedKeys.length > 0) {
      await pipeline.exec();
    }

    this.logger.log(`[Cache Pre-warm] Preloaded ${cachedKeys.length} questions into Redis (TTL 1h)`);
    return { cachedCount: cachedKeys.length, keys: cachedKeys };
  }
}

