# CodeGo — Platform Architecture Guide
> How 2000 students can write an assessment simultaneously without the backend jamming.
>
> **Current stack:** React + NestJS (×4) + NGINX + Judge0 CE + Bull/Redis + PgBouncer + PostgreSQL + ChromaDB + Ollama

---

## Table of Contents
1. [How the Frontend Works](#1-how-the-frontend-works)
2. [How the Backend Works](#2-how-the-backend-works)
3. [How Docker Wires Everything Together](#3-how-docker-wires-everything-together)
4. [How Load Balancing Works for 2000 Students](#4-how-load-balancing-works-for-2000-students)
5. [How Compiler Allocation Works (No Jamming)](#5-how-compiler-allocation-works-no-jamming)
6. [Running the Platform](#6-running-the-platform)
7. [Key Configuration Files](#7-key-configuration-files)

---

## 1. How the Frontend Works

The frontend is a **React SPA** (Single Page Application) built with Vite and served as static files by NGINX.

```
Student's Browser  →  NGINX (port 80)  →  /usr/share/nginx/html (pre-built React files)
```

> ⚠️ **The React app must be built before starting Docker** (`npm run build` in `codego-platform/`). NGINX mounts the `dist/` folder read-only. If you skip this step, the UI will be blank.

### Key behaviours

| Action | What happens |
|---|---|
| Student opens the app | NGINX serves `index.html` instantly from disk — no server logic needed |
| Student refreshes `/dashboard` | NGINX's `try_files` rule rewrites it to `index.html` — **this prevents "site not found" errors on hard refresh** |
| Static assets (JS, CSS) | Cached in the browser for 1 year via `Cache-Control: immutable` — never re-downloaded |
| API calls (`/api/...`) | NGINX proxies them to the NestJS backend cluster — the frontend never talks directly to a backend port |

### Local development proxy

When running `npm run dev` in `codego-platform/`, Vite acts as a dev proxy (`vite.config.ts`):
```
Browser → Vite dev server (port 5173) → http://localhost:80 (NGINX) → api1..4
```
The proxy target is `localhost:80` (NGINX), not `localhost:3000` (a single instance). This means the full Docker stack must be running even during frontend-only development.

### What the student sees during a submission

```
1. Click "Submit"
   └─► POST /api/submissions  →  receives { submissionId, status: "queued" } instantly

2. Every 2 seconds, poll:
   └─► GET /api/submissions/:id/status  →  { status: "running" }
   └─► GET /api/submissions/:id/status  →  { status: "running" }
   └─► GET /api/submissions/:id/status  →  { status: "completed", score: 85 }

3. Fetch full result once:
   └─► GET /api/submissions/:id  →  full grade report with test case details
```

The student gets a response in **under 100ms** from clicking Submit — no spinner waiting for code to compile.

---

## 2. How the Backend Works

The backend is a **NestJS** application (Node.js + TypeScript) broken into focused modules.

```
src/
├── auth/           Login, JWT token generation
├── users/          Student profiles, progress stats
├── questions/      AI question generation (Ollama), ChromaDB RAG retrieval
├── submissions/    Accept submissions → enqueue → return status
├── execution/      Judge0 CE wrapper + Bull worker processor
├── grading/        AI code review + deterministic pass/fail scoring
├── results/        Final result storage
├── faculty/        Faculty dashboard, CSV import, analytics
├── progress/       Student profile analytics (GET /api/profile)
└── common/
    └── redis/      Shared Redis client (cache + queue backbone)
```

### Code execution engine: Judge0 CE (self-hosted)

Code is **no longer sent to any external cloud API**. Judge0 CE runs as its own mini-cluster inside Docker:

```
worker1..4 (Bull jobs)
  └─► POST http://judge0-server:2358/submissions?base64_encoded=true&wait=true
             │
        judge0-worker (Resque worker process)
             │
        isolate sandbox (per-submission Linux container)
        [CPU: 5s limit | RAM: 256 MB | Separate process namespace]
```

Judge0 configuration is in `judge0.conf` (mounted read-only into the judge0 containers).

### Request lifecycle (simplified)

```
Login
  AuthService  →  validates bcrypt password  →  returns JWT token

Load Question
  QuestionsController  →  QuestionsService.getQuestion(id)
                       →  checks Redis cache (1-hour TTL)
                       →  if miss: reads from Postgres, stores in Redis
                       →  returns question JSON

Submit Code
  SubmissionsController  →  SubmissionsService.submitCode()
                         →  saves Submission row (status: RUNNING)
                         →  adds job to Bull 'execution' queue in redis-queue
                         →  returns { submissionId, status: "queued" }

Background (Worker container)
  ExecutionProcessor.handleRun()
    →  calls ExecutionService.runAllTestCases()
       →  for each test case: POST to Judge0 (self-hosted) → wait=true
    →  calls GradingService.grade()  (Ollama AI review + score)
    →  updates Submission row (status: COMPLETED, score: N)
    →  deletes Redis status cache key  (next poll gets fresh DB data)
    →  updates User progress stats
```

---

## 3. How Docker Wires Everything Together

Running `docker compose up --build` starts **19 containers** that work as one system.

> ℹ️ **Single image, 8 containers**: Docker builds exactly **one** backend image (`codego-backend:latest`). It is then reused for all 4 API instances and all 4 worker containers. Only `api1` has `build: ./backend` — the others declare `image: codego-backend:latest` directly.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          docker-compose.yml                            │
│                                                                        │
│  ┌─────────┐     ┌───────────────────────────────────────────────────┐ │
│  │  NGINX  │────►│   api1  api2  api3  api4   (NestJS, port 3000)    │ │
│  │  :80    │     └─────────────────────┬─────────────────────────────┘ │
│  └────┬────┘                           │                               │
│       │                      reads/writes                              │
│  serves React             ┌────────────▼────────────┐                  │
│  static files             │       PgBouncer          │                  │
│                           │   :6432  (tx pool)       │                  │
│                           └────────────┬────────────┘                  │
│                                        │ max 25 real connections        │
│                           ┌────────────▼────────────┐                  │
│                           │      PostgreSQL :5432    │                  │
│                           └─────────────────────────┘                  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ redis (app cache, allkeys-lru)                                  │   │
│  │   ← api1..4 use this for: question cache, submission status TTL │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ redis-queue (Bull jobs, noeviction)                             │   │
│  │   ← api1..4 enqueue jobs here                                   │   │
│  │   ← worker1..4 dequeue and process jobs from here              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌───────────────────┐   ┌──────────────────────────────────────────┐  │
│  │  worker1..4       │──►│  judge0-server + judge0-worker           │  │
│  │  (Bull workers)   │   │  judge0-db (postgres) + judge0-redis     │  │
│  └───────────────────┘   └──────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────┐   ┌──────────────┐                                 │
│  │   Ollama       │   │   ChromaDB   │  (AI grading, RAG)              │
│  │  (HOST:11434)  │   │  :8000       │                                 │
│  └────────────────┘   └──────────────┘                                 │
└────────────────────────────────────────────────────────────────────────┘
```

> ℹ️ **Ollama runs on the host machine**, not in Docker. The Docker containers reach it via `host.docker.internal:11434`.

### Two separate Redis instances (why)

| Instance | Service name | Eviction policy | Used for |
|---|---|---|---|
| `redis` | `redis` | `allkeys-lru` | Question cache, submission status TTL — evicting a stale cache entry is harmless |
| `redis-queue` | `redis-queue` | `noeviction` | Bull job queue — jobs must **never** be silently dropped under memory pressure |

### Environment variable handoff

The `backend/.env` file is for **local development only**.  
When running in Docker, `docker-compose.yml` overrides the critical variables automatically:

| Variable | Local `.env` value | Docker override |
|---|---|---|
| `DB_HOST` | `localhost` | `pgbouncer` |
| `DB_PORT` | `5432` | `6432` |
| `REDIS_HOST` | `localhost` | `redis` |
| `BULL_REDIS_HOST` | `localhost` | `redis-queue` |
| `JUDGE0_URL` | `http://localhost:2358` | `http://judge0-server:2358` |

You never need to manually edit these when switching between local and Docker environments.

---

## 4. How Load Balancing Works for 2000 Students

### The problem without load balancing

Node.js runs on a single CPU core. One NestJS instance can handle roughly 200-400 concurrent requests before it starts slowing down. At 9:00 AM when 2000 students log in simultaneously, a single instance would queue requests and eventually time out.

### The solution: 4 NestJS instances behind NGINX

```
2000 students
     │
     ▼
  NGINX (least_conn algorithm)
     │
     ├──► api1 (handling ~480 students)
     ├──► api2 (handling ~510 students)
     ├──► api3 (handling ~490 students)
     └──► api4 (handling ~520 students)
```

**`least_conn`** — NGINX always routes the next request to whichever instance has the fewest active connections. This self-balances without any manual tuning.

**`keepalive 64`** — NGINX reuses 64 open connections to each backend instance instead of re-handshaking for every request. This eliminates TCP overhead under high concurrency.

**`max_fails=3 fail_timeout=30s`** — If an instance crashes, NGINX stops sending it traffic within 3 failed requests and tries again after 30 seconds. Combined with `restart: always` in Docker, the container recovers and re-joins the pool automatically.

**`GET /health` endpoint** — Docker sends a health probe every 15 seconds. If it fails 3 times, Docker restarts the container. NGINX also monitors this to remove dead instances.

### Database connection pooling (PgBouncer)

Without PgBouncer, each of the 4 NestJS instances would hold 10 open Postgres connections = 40 total. Under burst load this could spike to hundreds. PostgreSQL's default `max_connections=100` would be breached and new connections would be refused.

```
4 API instances × 5 TypeORM connections each = 20 connections to PgBouncer
PgBouncer multiplexes these into 25 real Postgres connections (POOL_MODE=transaction)
Postgres only ever sees 25 connections — well within its limit of 50
```

### Redis caching (cutting DB load by ~60%)

Every time a student loads a question, the backend checks Redis first:

- **Question cache** (1-hour TTL) — 2000 students loading the same question = 1 DB query, not 2000.
- **Submission status cache** (2-second TTL) — 2000 students polling every 2s = at most ~1000 DB queries/second, not 2000.
- **JWT validation** — passport-jwt validates the token cryptographically without hitting the DB at all (user info is embedded in the token payload).

---

## 5. How Compiler Allocation Works (No Jamming)

This is the most important part. Previously, code execution happened **inside the HTTP request cycle** — the student's browser had to wait for the entire compile + run + grade cycle to complete before receiving a response. Under load, this caused timeouts.

### The new flow: queue-based async execution

```
BEFORE (blocking):
  Student submits  →  API waits for compiler (~5-15s)  →  API waits for AI grade (~3s)
  →  responds  ──  Total: 8-18 seconds per student, blocks the API thread

AFTER (non-blocking):
  Student submits  →  API saves row + adds to redis-queue  →  responds in <100ms
                                    │
                         Redis Bull Queue (redis-queue, noeviction)
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
           worker1              worker2             worker3/4
         (5 jobs max)         (5 jobs max)         (5 jobs max each)
               │
      for each test case:
        POST to Judge0 CE (self-hosted) → wait=true → result
      grade with Ollama AI
      update DB row
      invalidate Redis status cache
```

### Judge0 CE compiler allocation

**Self-hosted Judge0 CE** runs as its own mini-cluster inside Docker:

```
worker1..4 (Bull)  ──►  judge0-server:2358 (Rails HTTP API)
                              │
                    judge0-worker (Resque workers, COUNT_OF_WORKERS=2)
                              │
                    isolate sandbox (one per execution)
                    [CPU: 5s limit | RAM: 256 MB | Separate process namespace]
```

Configuration is in `judge0.conf` (mounted read-only into judge0 containers).

Each code submission gets its own **isolate sandbox** — a Linux container within the Judge0 worker with:
- CPU time limit: 5 seconds
- Memory limit: 256 MB
- Separate process namespace (student code cannot see other students' processes)

### Why it never jams

| Scenario | What happens |
|---|---|
| 2000 students submit at 9:00 AM | 2000 jobs enter `redis-queue` instantly. All 2000 API responses return in <100ms. |
| Workers process at their own pace | 4 workers × 5 concurrency = 20 Judge0 calls in-flight at any moment. Remaining jobs wait safely in Redis. |
| Judge0 is slow | The Bull job retries up to 3 times with exponential backoff. Student polls and eventually sees COMPLETED. |
| A worker crashes | Docker restarts it in seconds. It picks up pending jobs from Redis (jobs are never lost — `noeviction`). |
| Judge0 server is overloaded | `MAX_QUEUE_SIZE=200` in judge0.conf — if hit, Judge0 returns 503, Bull retries the job. |

### Estimated throughput

```
20 concurrent Judge0 executions (4 workers × 5 concurrency)
Each execution: ~3-8 seconds (compile + run all test cases)
Throughput: ~20 ÷ 5s avg = ~4 submissions completed per second
2000 submissions: ~500 seconds (~8 minutes) to clear the full queue

In practice: students are staggered — they don't all submit at exactly the same second.
Realistic clearance time for a 2000-student exam: 3-5 minutes.
```

---

## 6. Running the Platform

### Full Docker stack (normal mode)

```bash
# 1. Build the React frontend (required after any UI changes)
cd codego-platform
npm run build
cd ..

# 2. Start everything — Docker builds backend image ONCE, shares it across 8 containers
docker compose up --build -d

# 3. Check all containers are healthy before opening the browser
docker compose ps
# Wait until api1..4 show (healthy) — takes ~30 seconds

# Open the app
start http://localhost
```

> ⚠️ **First build takes ~5 minutes** (`npm ci` downloads 868 packages into Alpine Linux). Subsequent builds are instant — Docker caches the `npm ci` layer as long as `package.json` doesn't change.

### Checking load balancer is working

```bash
# Send 20 requests — you should see 4 different container IDs in the output
node demo-load-balancer.js 20

# Simulate 200 concurrent users
node demo-load-balancer.js 200

# Test fault tolerance: kill one instance
docker stop codego-api2-1
node demo-load-balancer.js 20    # traffic reroutes to 3 remaining instances
docker start codego-api2-1       # instance re-joins the pool
```

### Rebuilding after backend code changes

```bash
# Only the COPY and nest build layers re-run (~20 seconds)
docker compose up -d --build api1 api2 api3 api4 worker1 worker2 worker3 worker4
```

### Scaling workers if the queue is growing

```bash
# Not directly supported with named workers — edit docker-compose.yml
# to add worker5, worker6, etc. using the same image: codego-backend:latest pattern
```

### Watch logs

```bash
docker compose logs -f api1 worker1
docker compose logs -f judge0-server
```

---

## 7. Key Configuration Files

| File | What it controls |
|---|---|
| `docker-compose.yml` | Full service graph. Only `api1` has `build: ./backend`; others use `image: codego-backend:latest` |
| `backend/.env` | Secrets — never commit. `DB_PASS`, `REDIS_PASSWORD`, `JWT_SECRET` must be set. |
| `backend/Dockerfile` | `npm ci` → `COPY . .` → `nest build` → `start:prod` on Node 18 Alpine |
| `backend/.dockerignore` | **Critical.** Prevents 400 MB Windows `node_modules` from overwriting Linux binaries inside the image |
| `nginx/conf.d/default.conf` | `least_conn` load balancing, `keepalive 64`, `max_fails=3 fail_timeout=30s`, SPA `try_files` |
| `judge0.conf` | Judge0 CE limits: CPU 5s, RAM 256 MB, `MAX_QUEUE_SIZE=200`, `COUNT_OF_WORKERS=2` |
| `codego-platform/vite.config.ts` | Dev proxy: forwards `/api/*` to `http://localhost:80` (NGINX, not port 3000) |
| `demo-load-balancer.js` | CLI tool to visualise NGINX traffic distribution across 4 API instances |
