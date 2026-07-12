# 🚀 CodeGoAI Platform — Setup & Run Instructions

> **This guide reflects the current production-ready Docker architecture.**
> Code execution uses **self-hosted Judge0 CE** running inside Docker. No external cloud APIs are needed.

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v20+ (v18 works but generates warnings) | Only needed for local dev or running seed scripts |
| **Docker Desktop** | Latest | Must be running before any command |
| **RAM** | 8 GB minimum, 16 GB recommended | The full stack uses ~5-6 GB |

> ⚠️ **Windows users**: If Docker Desktop freezes or shows a "distro installation timeout", run `wsl --shutdown` in PowerShell, then wait 10 seconds for Docker Desktop to recover.

---

## 🏗️ Architecture at a Glance

```
Browser → NGINX (port 80) → api1, api2, api3, api4  (NestJS, least_conn)
                         → React SPA static files

api1..4 → PgBouncer → PostgreSQL
api1..4 → Redis (app cache)
api1..4 → Redis Queue (Bull jobs) → worker1..4 → Judge0 server → Judge0 worker
                                                               → isolate sandbox (per-submission)
api1..4 → ChromaDB (RAG vector store)
api1..4 → Ollama (AI grading — runs on the HOST machine, not Docker)
```

**Key principle:** The React frontend is served as pre-built static files by NGINX. You must run `npm run build` in `codego-platform/` before starting Docker if you changed any frontend code.

---

## 🛠️ Step 1: Configure Environment Variables

Copy the example env file and fill in your secrets:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and set these values (everything else can stay as-is):

```env
DB_PASS=your_secure_password          # Choose any password
REDIS_PASSWORD=your_redis_password    # Choose any password
JWT_SECRET=any_long_random_string     # e.g. openssl rand -hex 32
```

> ✅ The `docker-compose.yml` automatically overrides `DB_HOST`, `DB_PORT`, `REDIS_HOST`, and `JUDGE0_URL` for the Docker network. You do **not** need to change those.

---

## 🏗️ Step 2: Build the Frontend (Required After Any UI Changes)

```powershell
cd codego-platform
npm install
npm run build
cd ..
```

This outputs static files to `codego-platform/dist/`. NGINX mounts this folder read-only.

> ⚠️ If you skip this step, NGINX will serve a stale or empty UI. Always rebuild after frontend changes.

---

## 🐳 Step 3: Start the Full Stack

```powershell
docker compose up -d --build
```

**What happens:**
1. Docker builds **one** backend image (`codego-backend:latest`) from `backend/Dockerfile`
2. That single image is reused for all 4 API instances and all 4 worker containers
3. All 19 containers start in dependency order (Postgres → PgBouncer → API → NGINX)

**Wait for everything to be healthy:**

```powershell
docker compose ps
```

All `api1` through `api4` should show `(healthy)` before you open the browser. This takes ~30 seconds after the containers start.

**Open the app:** http://localhost

> 🕐 **First-time build takes ~5 minutes** because `npm ci` downloads 868 packages into the Alpine Linux image. Subsequent builds are instant due to Docker layer cache (as long as `package.json` hasn't changed).

---

## 🧠 Step 4: Seed the Database (First Run Only)

Open a PowerShell window in the `codego` root directory:

```powershell
# Install root-level dependencies
npm install

# Import student accounts into PostgreSQL
npx ts-node scripts/bulk-import-students.ts

# Seed AI questions into ChromaDB vector store
npx ts-node scripts/seed-vector-store.ts
```

> ⚠️ ChromaDB must be running before seeding (`docker compose ps` should show `chroma` as Up).

---

## 🤖 Step 5: Set Up Ollama AI (Required for Grading)

Ollama runs on your **host machine** (not inside Docker). The backend connects to it via `host.docker.internal:11434`.

**Install Ollama** from https://ollama.com, then pull the grading model:

```powershell
ollama pull qwen2.5-coder:1.5b
```

> This model is used for fast AI code grading (2-5 second response). It is ~1 GB.
> The `OLLAMA_GRADING_MODEL=qwen2.5-coder:1.5b` variable in `.env` controls which model is used.

---

## 🎉 Test Accounts

| Role | Reg Number | Password |
|---|---|---|
| Student | `21CS001` | `College@2024` |
| Faculty | `FAC001` | `College@2024` |

> Use the **Demo Login** buttons on the login page to test the UI without any database connection.

---

## ⚡ Code Execution Flow

```
Student clicks "Submit"
  → POST /api/submissions  (responds instantly with submissionId)
  → Job added to Bull queue in Redis

Background worker picks up job:
  → POST to Judge0 CE (http://judge0-server:2358/submissions?wait=true)
  → Judge0 runs code in isolate sandbox (5s CPU limit, 256 MB RAM)
  → Result returned to worker
  → Worker calls Ollama for AI code review
  → Submission updated in PostgreSQL (status: completed, score: N)
  → Redis status cache invalidated

Student polls every 2s:
  → GET /api/submissions/:id/status  (reads from Redis cache, not DB)
  → Eventually sees: { status: "completed", score: 85 }
```

**Supported languages:** Python, Java, C++, C, JavaScript, R (all via Judge0 language IDs)

---

## ⚖️ Load Balancer Demo

A demo script is included at `demo-load-balancer.js` to visualise traffic distribution:

```powershell
# Send 20 requests across all 4 instances
node demo-load-balancer.js 20

# Send 200 requests (simulates 200 concurrent users)
node demo-load-balancer.js 200

# Test fault tolerance: kill one instance then run again
docker stop codego-api2-1
node demo-load-balancer.js 20
# Traffic automatically reroutes to 3 remaining instances

# Restore it
docker start codego-api2-1
```

---

## 🔧 Common Issues & Fixes

| Issue | Fix |
|---|---|
| `pull access denied for codego-backend` | Normal on first run — Docker is building it locally. Just wait for the build to finish. |
| `npm run build` takes forever inside Docker | Check that `backend/.dockerignore` exists and contains `node_modules`. Without it, Docker copies your 400 MB Windows node_modules into the Linux image. |
| Docker Desktop freezes / `WSL CommandTimedOut` | Run `wsl --shutdown` in PowerShell. Wait 10s. Docker restarts automatically. |
| `password authentication failed` | The Postgres volume has an old password. Reset it: `docker compose down; docker volume rm codego_postgres_data; docker compose up -d` |
| `ECONNREFUSED` on `/api/*` in browser console | The backend containers are not healthy yet. Run `docker compose ps` and wait for all `api` instances to show `(healthy)`. |
| Profile page shows "Backend is offline" | Expected when running frontend locally (`npm run dev`) without the Docker stack. Start Docker or use Demo Login. |
| ChromaDB not found | `docker compose up -d chroma` |
| Judge0 returns 503 | Judge0 is still initialising (takes ~60s on first start). Wait and retry. |
| `distro installation timeout` in Docker Desktop | Docker Desktop's WSL VM crashed. Run `wsl --shutdown` and reopen Docker Desktop. |

---

## 🔁 Rebuilding After Backend Code Changes

```powershell
# Rebuild and restart only the backend (fast — uses cached npm ci layer)
docker compose up -d --build api1 api2 api3 api4 worker1 worker2 worker3 worker4
```

> Only the `COPY . .` and `RUN npm run build` layers re-run (~20 seconds). The `npm ci` layer is cached as long as `package.json` hasn't changed.

---

## 🗂️ Local Development (Without Docker)

For rapid backend iteration, you can run only the infrastructure in Docker and the backend/frontend natively:

```powershell
# Start only infrastructure
docker compose up -d postgres redis redis-queue chroma judge0-server judge0-worker judge0-db judge0-redis

# Backend (in codego/backend)
npm run start:dev

# Frontend (in codego/codego-platform) — proxies /api/* to localhost:80
npm run dev
```

> The Vite dev server (`vite.config.ts`) proxies all `/api/*` requests to `http://localhost:80` (NGINX), so you need either the full Docker stack or to change the proxy target to `http://localhost:3000` for native backend mode.

---

## 📁 Key Files Reference

| File | Purpose |
|---|---|
| `docker-compose.yml` | Full stack definition. `api1` is the only service with `build:`. All others use the pre-built `codego-backend:latest` image. |
| `backend/.env` | Secrets — never commit this file. |
| `backend/Dockerfile` | Multi-step: `npm ci` → `COPY . .` → `nest build` → `start:prod` |
| `backend/.dockerignore` | **Critical.** Prevents Windows `node_modules` from being copied into the Linux image. |
| `nginx/conf.d/default.conf` | NGINX load balancer config (`least_conn`, `keepalive 64`, `max_fails=3`). |
| `judge0.conf` | Judge0 CE limits (CPU 5s, Memory 256 MB, max queue 200). |
| `codego-platform/vite.config.ts` | Vite dev proxy — forwards `/api/*` to `http://localhost:80` (NGINX). |
| `demo-load-balancer.js` | CLI tool to visualise load distribution across 4 API instances. |
