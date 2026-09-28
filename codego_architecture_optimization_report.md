# CodeGo — Architectural Optimization & Competitive Feature Roadmap

**Prepared for:** CodeGo Engineering Leadership
**Basis:** System Architecture & Engineering Report (React 19 / NestJS 11 / Judge0 CE / PostgreSQL / Redis / PgBouncer / ChromaDB)
**Date:** September 9, 2026

---

## 1. Architectural Optimizations

### 1.1 Replacing 2-Second Polling with Event-Driven Real-Time Updates

**Diagnosis:** `Assessment.tsx` polls `GET /api/submissions/:id/status` on a `setInterval(2000)`. At 1,000 concurrent exam-takers this is ~500 req/s of near-useless traffic (most polls return "still running"), and it hits 4 clustered API nodes behind NGINX `least_conn`, so status data must be fan-out-safe across instances — this is exactly what Redis Pub/Sub is for.

**Recommended pattern: SSE, not WebSockets.**
Justification: submission status is a *server → client* one-way stream (pending → running → completed/error). SSE gives you auto-reconnect, works over plain HTTP/1.1 (so it survives corporate/college proxies and the Electron lockdown client better than WS upgrade headshakes), and needs no new NGINX WS proxy config beyond disabling buffering. Reserve WebSockets for the Socratic Mentor chat (Feature 2 below), which is genuinely bidirectional.

**Implementation strategy:**

1. **Cross-node fan-out via Redis Pub/Sub.** Since a submission is enqueued by whichever `apiN` instance received the request, but the Bull worker that completes the job may notify a *different* `apiN` instance than the one holding the client's open SSE connection, every API node subscribes to a shared Redis channel and only forwards events for connections it actually holds.

2. **Backend: publish on job completion** (in `ExecutionProcessor`, replacing/augmenting the current `RedisCache` invalidation call):

```typescript
// execution/execution.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Processor('submissions')
export class ExecutionProcessor {
  constructor(
    @Inject('REDIS_CACHE_CLIENT') private readonly redisCache: Redis,
  ) {}

  @Process('run')
  async handleSubmission(job: Job<{ submissionId: string }>) {
    const result = await this.gradeSubmission(job.data.submissionId);

    // Persist as before
    await this.submissionsRepo.update(job.data.submissionId, result);

    // Publish instead of relying purely on TTL cache invalidation
    await this.redisCache.publish(
      'submission:events',
      JSON.stringify({
        submissionId: job.data.submissionId,
        status: result.status,       // 'completed' | 'error'
        score: result.score,
        testsPassed: result.testsPassed,
        testsTotal: result.testsTotal,
      }),
    );
  }
}
```

3. **Backend: NestJS SSE Gateway** — each API node subscribes once at boot and multiplexes to per-request `Subject`s keyed by `submissionId`:

```typescript
// submissions/submission-events.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import Redis from 'ioredis';

@Injectable()
export class SubmissionEventsService implements OnModuleInit {
  private streams = new Map<string, Subject<MessageEvent>>();

  constructor(@Inject('REDIS_SUBSCRIBER_CLIENT') private readonly sub: Redis) {}

  onModuleInit() {
    this.sub.subscribe('submission:events');
    this.sub.on('message', (_channel, raw) => {
      const evt = JSON.parse(raw);
      const stream = this.streams.get(evt.submissionId);
      if (stream) {
        stream.next({ data: evt } as MessageEvent);
        stream.complete();               // terminal state reached
        this.streams.delete(evt.submissionId);
      }
    });
  }

  register(submissionId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.streams.set(submissionId, subject);
    return subject;
  }
}
```

```typescript
// submissions/submissions.controller.ts
@Sse(':id/status/stream')
streamStatus(@Param('id') id: string): Observable<MessageEvent> {
  return this.eventsService.register(id).asObservable();
}
```

4. **Frontend: replace `setInterval` with `EventSource`** (drop-in inside `Assessment.tsx`, ideally lifted into a `useSubmissionStatus` hook backed by TanStack Query for retry/backoff semantics):

```typescript
// hooks/useSubmissionStream.ts
export function useSubmissionStream(submissionId: string | null) {
  const [status, setStatus] = useState<SubmissionStatus | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    const es = new EventSource(`/api/submissions/${submissionId}/status/stream`);

    es.onmessage = (e) => {
      setStatus(JSON.parse(e.data));
      es.close();                       // single terminal event, then done
    };
    es.onerror = () => {
      // EventSource auto-retries on transient network errors by default;
      // close explicitly only on submission-terminal states or unmount.
    };
    return () => es.close();
  }, [submissionId]);

  return status;
}
```

5. **Operational notes:**
   - NGINX must disable buffering on the SSE route: `proxy_buffering off; proxy_read_timeout 3600s; chunked_transfer_encoding off;` on `location /api/submissions/`.
   - Cap open SSE connections per node (Node's default HTTP keep-alive socket limits) — with 4 nodes and 2,000–10,000 concurrent students, budget ~2,500 idle connections per node, which is trivial for Node's event loop (SSE is far cheaper than polling in both CPU and bandwidth).
   - Keep the existing `submission:status:<id>` Redis cache key as a **fallback poll endpoint** for clients that fail to establish SSE (older browsers, restrictive campus firewalls) — don't delete the polling route, degrade to it.
   - This is not a full WebSocket rewrite — it changes only the status-check leg. The "Run Code" endpoint (`/api/submissions/run`) stays synchronous/immediate as-is, since it's already low-latency.

### 1.2 Indexing & Caching Strategy for 10,000 Concurrent Exam-Takers

The report already correctly identifies the missing composite indexes for `faculty.service.ts` queries. Scaling from the current 2,000-student design target to 10,000 concurrent requires action on four fronts: **indexing, connection pooling, cache topology, and write amplification.**

**A. Indexes (extend what's proposed in §7.1.2 of the report):**

```sql
-- Faculty analytics filtering (already identified — confirm as P0)
CREATE INDEX CONCURRENTLY idx_submissions_faculty_filter
  ON submissions(status, difficulty, language, "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_users_dept_year
  ON users(department, year);

CREATE INDEX CONCURRENTLY idx_submissions_user_created
  ON submissions("userId", "createdAt" DESC);

-- Additional indexes for 10k-scale exam load:
-- Hot path: "has this student already submitted this question in this session?"
CREATE INDEX CONCURRENTLY idx_submissions_user_question
  ON submissions("userId", "questionId", "createdAt" DESC);

-- Leaderboard / streak recalculation queries hit this on every submission
CREATE INDEX CONCURRENTLY idx_users_streak
  ON users("currentStreak" DESC, "averageScore" DESC);

-- Partial index: exam-time dashboards only care about in-flight submissions
CREATE INDEX CONCURRENTLY idx_submissions_active
  ON submissions(status, "createdAt")
  WHERE status IN ('pending', 'running');
```

Use `CREATE INDEX CONCURRENTLY` in production to avoid locking the `submissions` table during an active exam window. Also run `ANALYZE submissions;` after backfilling — with 10k students × ~3 attempts/question × multiple questions, this table grows fast and the planner needs fresh statistics.

**B. Connection pooling headroom.** PgBouncer is currently sized for 500 client / 25 server connections at a 2,000-student target. At 10,000 concurrent:
- Raise `max_client_conn` to ~2,000 (4 API nodes × ~500 each, matching Node's realistic concurrent-request ceiling per instance) and `default_pool_size` (server-side) to ~40–50 — Postgres 16 on reasonable hardware (8–16 vCPU) tolerates this fine in `transaction` mode since PgBouncer is already doing the multiplexing.
- Confirm `pool_mode = transaction` stays set (it is) — this is what lets 2,000 client connections share 40–50 real Postgres backends.
- Add a **second PgBouncer pool tier**: split read-heavy faculty analytics traffic onto a **read replica** behind its own PgBouncer instance, so exam-critical writes (submission inserts/updates) never queue behind a faculty dashboard doing a full-table scan.

**C. Redis cache topology — scale the existing dual-Redis split, don't merge it:**
- `RedisCache` (256 MB, `allkeys-lru`) is fine for question payloads (1h TTL) but at 10,000 students hitting distinct questions from a 29k bank, cache hit rate matters more than size. Increase to 512 MB–1 GB and monitor `evicted_keys` — if eviction is high during exam windows, the working set (active exam's question subset) is bigger than assumed and you should **pre-warm** the cache by pushing that day's assigned question set into Redis at exam-start rather than relying on lazy population.
- Add a **third logical Redis use** (can share the cache instance, different key prefix) for **rate-limiting counters** — this directly fixes the report's §7.2.2 finding (in-memory throttler doesn't share state across 4 nodes). Bind `@nestjs/throttler` to `ThrottlerStorageRedisService`:

```typescript
// app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [{ ttl: 60000, limit: 100 }],
    storage: new ThrottlerStorageRedisService(redisCacheClient),
  }),
}),
```

- Consider **read-through caching for `users` streak/score data** during exam windows (`user:profile:<id>`, short TTL ~30s) since dashboard/leaderboard reads spike right alongside submission writes.

**D. Write amplification at submission time.** Each submission currently triggers: 1 Postgres write (submission row), 1 Judge0 call, 1 Ollama call, 1 Redis cache invalidation, and (after the SSE change) 1 Redis publish. At 10,000 students submitting within a tight window (e.g., last 5 minutes before exam close — the classic "auto-submit stampede"), this is the real bottleneck, not steady-state polling:
- Increase Bull worker concurrency and worker replica count proportionally (report shows 4 workers × 5 concurrency = 20 parallel; for 10k-student stampedes, model expected peak submissions/minute and size to ~60–100 parallel execution slots, bounded by Judge0/isolate CPU capacity, not by Node).
- Add a **Bull rate limiter / backpressure** (`limiter: { max: N, duration: 1000 }`) on the queue so a submission stampede degrades to "slower results" rather than saturating Judge0 and Ollama simultaneously and causing both to time out.
- Batch the "auto-submit on timer expiry" client behavior: if the frontend fires all `POST /api/submissions` calls at the exact millisecond a countdown hits zero, add small client-side jitter (0–3s random delay) to smooth the stampede rather than have 10,000 clients hit the same instant.

### 1.3 Circuit Breaker for the Ollama AI Grading Engine

The report already flags this correctly (§7.3.2): with no circuit breaker, a crashed/VRAM-exhausted Ollama instance means every grading request hangs until HTTP timeout, and — because of the `Promise.all(testExecution, aiGrading)` pattern in `ExecutionProcessor` — this **also delays the deterministic test results the student is waiting on**, even though those are already available.

**Design: a NestJS interceptor + a small in-memory (or Redis-backed, for multi-node consistency) circuit-breaker state machine**, using the classic Closed → Open → Half-Open states.

```typescript
// grading/ollama-circuit-breaker.service.ts
import { Injectable, Logger } from '@nestjs/common';

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class OllamaCircuitBreakerService {
  private state: BreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureAt = 0;

  private readonly FAILURE_THRESHOLD = 5;      // failures within window before opening
  private readonly OPEN_DURATION_MS = 30_000;  // stay open 30s before testing recovery
  private readonly REQUEST_TIMEOUT_MS = 4_000; // hard cap per grading call

  private readonly logger = new Logger(OllamaCircuitBreakerService.name);

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureAt > this.OPEN_DURATION_MS) {
        this.state = 'HALF_OPEN';
      } else {
        this.logger.warn('Ollama circuit OPEN — using deterministic-only fallback');
        return fallback();
      }
    }

    try {
      const result = await this.withTimeout(fn(), this.REQUEST_TIMEOUT_MS);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      this.logger.error(`Ollama call failed: ${err.message}`);
      return fallback();
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureAt = Date.now();
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Ollama request timed out')), ms),
      ),
    ]);
  }
}
```

**Wiring it into the grading pipeline (`GradingService`):**

```typescript
// grading/grading.service.ts
async analyzeCodePublic(code: string, question: Question) {
  return this.circuitBreaker.execute(
    () => this.ollamaClient.generate({ model: 'qwen2.5-coder:1.5b', /* ...prompt... */ }),
    () => ({
      aiScore: null,                 // explicit "not evaluated", never fabricated
      degraded: true,
      note: 'AI qualitative review temporarily unavailable — scored on test cases only.',
    }),
  );
}
```

**Grading matrix adjustment when degraded:** rather than silently zeroing the 40-point AI component (which would unfairly punish students), rescale: `finalScore = (testsPassed / testsTotal) * 100` when `degraded === true`, and flag the submission (`gradeResult.degraded = true`) for a faculty-side re-grade queue once Ollama recovers — a background job can re-run `analyzeCodePublic` for all `degraded=true` submissions and patch scores after the fact.

**Observability:** emit a Prometheus/StatsD counter on every state transition (`ollama_circuit_state{state="open"}`) so faculty dashboards can show "AI review temporarily degraded" banners during an outage rather than students silently getting different scoring rules with no visibility.

---

## 2. Three High-Impact Competitive Features

### Feature 1 — Biometric Keystroke Dynamics & Code DNA Analysis

**Goal:** Distinguish organic problem-solving from pasted/AI-generated code, without cameras or invasive proctoring — using signal already available from the Monaco editor's input stream.

**What to capture (client-side, inside the existing `Assessment.tsx` editor mount):**
- **Inter-keystroke timing (IKT):** millisecond deltas between keydown events. Human coding shows a characteristic bursty rhythm — fast within a "thought" (variable names, brackets), pauses at decision points (before a new line of logic). Pasted/AI code shows near-instant, uniform insertion.
- **Paste telemetry:** every `paste` event on the Monaco model, recording pasted character count, timestamp, and clipboard-to-editor latency. A student who pastes 40 lines in one event 90 seconds after starting is a very different signal than one who types incrementally.
- **Edit-graph shape, not just typing speed:** track insertion vs. deletion ratio, cursor-jump frequency (does the student write top-to-bottom, or does code appear in the middle of a function that didn't exist a keystroke ago — the latter is a strong paste/AI-insertion signature even without a formal paste event, e.g. drag-and-drop or a virtual-machine clipboard bridge).
- **Syntax construction order:** does the function signature appear before the body (natural incremental coding) or does a complete, syntactically valid block appear atomically (characteristic of LLM-generated or copy-pasted code)?

**Architecture:**
1. Frontend buffers keystroke events client-side (never sends raw keystrokes over the wire per-key — too chatty); batches into 2–3 second windows and computes a small feature vector (mean IKT, IKT variance, paste-char-ratio, burst-count) client-side.
2. `POST /api/submissions/:id/telemetry` sends these windowed feature vectors alongside the existing submission flow — cheap, privacy-respecting (no raw keystroke *content*, only timing metadata).
3. Backend stores a `keystroke_sessions` table (`submissionId`, `windowIndex`, `featureVector jsonb`, `createdAt`) and runs a lightweight heuristic/classifier (start with a rule-based scorer; graduate to a small trained model once you have labeled data) producing a `codeOriginalityScore` (0–100) surfaced to faculty alongside the existing AI-quality score — **never** auto-fails a student; it's a flag for human review, same posture as Turnitin.
4. This deliberately avoids webcams/screen-recording — it's inference from typing biomechanics, which is far less invasive and doesn't require Electron kiosk mode to function (works in the web SPA too).

**Honesty note for product framing:** keystroke-dynamics-based AI-detection has real false-positive risk (fast, confident typists exist; some students genuinely think in complete blocks). Position this as a *review flag for faculty*, not an automated accusation/penalty — this is both the ethically correct design and the one least likely to generate disputes/legal exposure for an academic platform.

### Feature 2 — Real-Time Socratic AI Debugging Mentor

**Goal:** A conversational side-panel, available only in **practice mode** (never during graded assessments, to preserve exam integrity), that guides via questions rather than answers.

**Why this is genuinely differentiated:** LeetCode/HackerRank hint systems are static, pre-written, difficulty-tiered strings. A live LLM conversation that reads the student's *actual current code* and responds Socratically ("What do you expect `left` to equal after this loop iteration when the array is empty?") is a fundamentally different pedagogical tool — and CodeGo already has Ollama in the stack, so no new inference infrastructure is needed, only a new prompt contract and a WebSocket channel.

**Guardrail design (the hard part):** the system prompt must structurally prevent solution leakage:
- Never allowed to output a code block containing a full or majority solution.
- Constrained to Socratic question forms unless the student explicitly asks for a specific concept explanation (e.g., "what's a hash map").
- Given the student's *current* editor buffer + the problem statement + test case failures as context, but instructed to respond only with guiding questions, complexity hints, or naming of relevant algorithmic concepts (e.g., "this looks like a two-pointer problem") — never literal code.

This is real-time bidirectional chat, so **WebSockets are the right transport** here (unlike Feature in §1.1's status updates) via a NestJS Gateway.

### Feature 3 — Time-Travel Keystroke Playback for Faculty

**Goal:** Reuse the exact telemetry stream from Feature 1 (no duplicate instrumentation) to let faculty scrub through a student's entire coding session like a video timeline — an animated diff-replay rather than a static before/after code comparison.

**Architecture:**
- Extend the Feature 1 telemetry capture to also buffer **actual editor deltas** (Monaco's built-in `onDidChangeModelContent` gives you precise `{range, text}` change objects "for free" — this is exactly what Monaco/VS Code use internally for undo/redo, so it's a natural, low-overhead capture point) alongside the timing metadata, batched and uploaded the same way.
- Store as an ordered event log (`code_deltas` table: `submissionId`, `sequenceNum`, `deltaJson`, `timestampMs`) rather than periodic full-code snapshots — deltas are far smaller and let you reconstruct any point in time by replaying from the initial boilerplate.
- Faculty UI: a scrubber timeline (reuse `recharts` or a simple custom SVG timeline already in the stack) that reconstructs editor state at any timestamp by replaying deltas up to that point into a read-only Monaco instance, with **large single-delta insertions visually flagged** (a delta inserting >80 characters in one event is auto-highlighted red on the timeline — this is the same paste signal from Feature 1, just visualized rather than scored).
- This is a genuinely rare feature even among enterprise assessment platforms — most only diff final vs. initial code. Full replay directly supports both integrity review *and* the stated goal of understanding a student's actual problem-solving process (valuable pedagogically, independent of cheating detection).

**Recommendation on build order:** implement Feature 1's telemetry pipeline first — Feature 3 is almost entirely "Feature 1's capture layer plus a playback UI," so building them in that sequence avoids duplicating instrumentation work. Feature 2 is architecturally independent and can be built in parallel.

---

## 3. Implementation Roadmap & Code — Top Recommended Feature

**Recommendation: build Feature 1 (Keystroke Dynamics & Code DNA) first.** It has the best cost-to-differentiation ratio — no new infrastructure (reuses Postgres + the existing submission flow), directly strengthens academic integrity (CodeGo's core value proposition per the report's Executive Summary), and structurally unlocks Feature 3 with near-zero additional capture work.

### 3.1 Backend — Telemetry Ingestion & Scoring

```typescript
// telemetry/entities/keystroke-window.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('keystroke_windows')
export class KeystrokeWindow {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  submission: Submission;

  @Column('int') windowIndex: number;

  @Column('jsonb')
  featureVector: {
    meanInterKeyMs: number;
    stdDevInterKeyMs: number;
    pastedCharCount: number;
    typedCharCount: number;
    maxSingleInsertionLength: number;
    burstCount: number;             // rapid-fire sequences >6 keys under 50ms apart
  };

  @CreateDateColumn() createdAt: Date;
}
```

```typescript
// telemetry/telemetry.controller.ts
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelemetryService } from './telemetry.service';
import { TelemetryWindowDto } from './dto/telemetry-window.dto';

@UseGuards(JwtAuthGuard)
@Controller('submissions/:id/telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  async ingest(@Param('id') submissionId: string, @Body() dto: TelemetryWindowDto) {
    return this.telemetryService.recordWindow(submissionId, dto);
  }
}
```

```typescript
// telemetry/telemetry.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeystrokeWindow } from './entities/keystroke-window.entity';
import { TelemetryWindowDto } from './dto/telemetry-window.dto';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(KeystrokeWindow)
    private readonly windowRepo: Repository<KeystrokeWindow>,
  ) {}

  async recordWindow(submissionId: string, dto: TelemetryWindowDto) {
    const window = this.windowRepo.create({
      submission: { id: submissionId } as any,
      windowIndex: dto.windowIndex,
      featureVector: dto.featureVector,
    });
    await this.windowRepo.save(window);
    return { recorded: true };
  }

  /** Rule-based v1 scorer — replace with a trained classifier once labeled data exists. */
  async computeOriginalityScore(submissionId: string): Promise<number> {
    const windows = await this.windowRepo.find({
      where: { submission: { id: submissionId } as any },
      order: { windowIndex: 'ASC' },
    });
    if (windows.length === 0) return 100; // no signal yet, don't penalize

    let score = 100;
    for (const w of windows) {
      const fv = w.featureVector;
      const totalChars = fv.pastedCharCount + fv.typedCharCount;
      const pasteRatio = totalChars > 0 ? fv.pastedCharCount / totalChars : 0;

      if (pasteRatio > 0.5) score -= 25;
      if (fv.maxSingleInsertionLength > 150) score -= 20;
      if (fv.stdDevInterKeyMs < 5 && fv.typedCharCount > 30) score -= 15; // unnaturally uniform typing
    }
    return Math.max(0, Math.min(100, score));
  }
}
```

### 3.2 Frontend — Windowed Capture Hook (Monaco Integration)

```typescript
// hooks/useKeystrokeTelemetry.ts
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { apiClient } from '../lib/apiClient';

interface FeatureVector {
  meanInterKeyMs: number;
  stdDevInterKeyMs: number;
  pastedCharCount: number;
  typedCharCount: number;
  maxSingleInsertionLength: number;
  burstCount: number;
}

const WINDOW_MS = 2500;

export function useKeystrokeTelemetry(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  submissionId: string | null,
) {
  const keyTimestamps = useRef<number[]>([]);
  const pastedChars = useRef(0);
  const typedChars = useRef(0);
  const maxInsertion = useRef(0);
  const windowIndex = useRef(0);

  useEffect(() => {
    if (!editor || !submissionId) return;

    const keyDisposable = editor.onKeyDown(() => {
      keyTimestamps.current.push(performance.now());
    });

    const contentDisposable = editor.onDidChangeModelContent((e) => {
      for (const change of e.changes) {
        const len = change.text.length;
        maxInsertion.current = Math.max(maxInsertion.current, len);
        if (e.isFlush) continue; // ignore programmatic resets (e.g. boilerplate load)
        if (change.text && len > 1) {
          pastedChars.current += len;   // multi-char single-event insert ≈ paste-like
        } else if (len === 1) {
          typedChars.current += 1;
        }
      }
    });

    const interval = setInterval(async () => {
      const deltas = computeInterKeyDeltas(keyTimestamps.current);
      const fv: FeatureVector = {
        meanInterKeyMs: mean(deltas),
        stdDevInterKeyMs: stdDev(deltas),
        pastedCharCount: pastedChars.current,
        typedCharCount: typedChars.current,
        maxSingleInsertionLength: maxInsertion.current,
        burstCount: countBursts(deltas),
      };

      if (fv.typedCharCount + fv.pastedCharCount > 0) {
        await apiClient.post(`/submissions/${submissionId}/telemetry`, {
          windowIndex: windowIndex.current++,
          featureVector: fv,
        });
      }

      keyTimestamps.current = [];
      pastedChars.current = 0;
      typedChars.current = 0;
      maxInsertion.current = 0;
    }, WINDOW_MS);

    return () => {
      keyDisposable.dispose();
      contentDisposable.dispose();
      clearInterval(interval);
    };
  }, [editor, submissionId]);
}

function computeInterKeyDeltas(ts: number[]): number[] {
  const deltas: number[] = [];
  for (let i = 1; i < ts.length; i++) deltas.push(ts[i] - ts[i - 1]);
  return deltas;
}
function mean(a: number[]) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function stdDev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
}
function countBursts(deltas: number[]): number {
  let bursts = 0, run = 0;
  for (const d of deltas) {
    if (d < 50) run++; else { if (run >= 6) bursts++; run = 0; }
  }
  if (run >= 6) bursts++;
  return bursts;
}
```

**Wiring into `Assessment.tsx`:** call `useKeystrokeTelemetry(editorRef.current, currentSubmissionId)` once the Monaco instance mounts and a submission session begins — it runs silently alongside the existing proctoring engine with no UI footprint, and requires no changes to the current "Run Code" or "Submit" flows.

---

## 4. UI Enhancement Suggestions

The report itself flags the current frontend aesthetic — glassmorphism, dark palette, reactive particle background — as generic; it's the default look of most AI-tool dashboards, not something distinct to a coding assessment platform. A few targeted directions:

- **Replace the particle background with a functional hero moment.** A live mini test-runner animation (tests appearing and flipping pass/fail in sequence) says more about the product than decorative particles, and reuses assets you already have (Judge0 result states).
- **Lean into the editor itself as a design motif.** Use Monaco's line-number gutter as a recurring structural element outside the IDE too (landing page margins, section dividers) instead of generic numbered badges — it's literally what the product is.
- **Use git-diff styling for feature/benefit lists** (`+ added line` in green) instead of identical rounded SaaS cards — it's on-brand for a coding tool and avoids the templated-card-grid look `FacultyDashboard.tsx` and the landing page currently share.
- **Reserve one accent color for brand, not decoration.** An amber/phosphor-terminal tone (nodding to classic terminal monitors) reads more distinctive than the common acid-green-on-black dark-mode default, and keeps pass/fail green/red meaningful as functional states rather than competing with the brand color.
- **One deliberate motion moment per screen, not motion everywhere.** Right now hover transitions and particle effects are scattered; pick a single orchestrated animation per key screen (e.g., the results reveal) and let the rest of the UI stay still — it reads calmer and more intentional.
- **Split the monolithic `Assessment.tsx`/`FacultyDashboard.tsx` styling from their logic** so visual updates (palette, type scale, motion) don't require touching state/network code — this also unblocks the bundle-size fix already noted in §7.1.3 of the original report.

---

## Summary Priority Order

| Priority | Item | Why first |
|---|---|---|
| P0 | Redis-backed throttler + faculty composite indexes | Already-identified correctness/security gaps; low effort, no new infra |
| P0 | Ollama circuit breaker | Prevents an AI outage from blocking deterministic grading — direct student-facing risk today |
| P1 | SSE replacing polling | Removes the largest source of unnecessary load at current scale, prerequisite for comfortable 10k scaling |
| P1 | Indexing/pooling/Bull backpressure for 10k concurrency | Needed before any 10k-student pilot; test with a load-testing pass against Judge0/Ollama capacity first |
| P2 | Feature 1 (Keystroke Dynamics) | Best cost-to-differentiation ratio; unlocks Feature 3 |
| P2 | Feature 3 (Time-Travel Playback) | Builds directly on Feature 1's capture layer |
| P3 | Feature 2 (Socratic Mentor) | Independent track; highest guardrail/prompt-engineering risk, budget extra QA time for solution-leakage testing |
