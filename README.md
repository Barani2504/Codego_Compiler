# ⚡ CodeGoAI — Quick Setup & Commands

All commands needed to set up and run the CodeGoAI platform.

---

## Option 1: Docker Full-Stack Setup (Recommended)

Run the complete cluster (NGINX + 4× API + 4× Workers + Postgres + Redis + Judge0 Sandbox).

### 1. Setup Environment
```powershell
Copy-Item backend\.env.example backend\.env
```
*(On Mac/Linux: `cp backend/.env.example backend/.env`)*

### 2. Build Frontend
```powershell
cd codego-platform
npm install
npm run build
cd ..
```

### 3. Start Docker Cluster
```powershell
docker compose up -d --build
```
Verify all containers are running:
```powershell
docker compose ps
```

### 4. Start AI Model (Host Machine)
```powershell
ollama pull qwen2.5-coder:1.5b
```

### 5. Seed Database
```powershell
npm install
npx ts-node scripts/bulk-import-students.ts
npx ts-node scripts/seed-vector-store.ts
```

### 6. Access the Application
- **Frontend App**: `http://localhost`
- **Judge0 Compiler**: `http://localhost:2358`
- **Postgres**: `localhost:6432` (user: `platform_user`)

---

## Option 2: Local Development (Without Full Docker Stack)

### Terminal 1: Frontend (`http://localhost:5173`)
```powershell
cd codego-platform
npm install
npm run dev:web
```

### Terminal 2: Backend (`http://localhost:3000`)
```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run start:dev
```

### Supporting Services (If running Backend locally)
Start only the database, cache, and compiler sandbox:
```powershell
docker compose up -d postgres redis redis-queue chroma judge0-server judge0-worker judge0-db judge0-redis
```

---

## Option 3: Instant Demo Mode (Zero Backend Setup)

Run the frontend independently with built-in mock simulation:
```powershell
cd codego-platform
npm install
npm run dev:web
```
1. Open `http://localhost:5173`.
2. Click **"Demo Student"** or **"Demo Faculty"** on the login page.
3. No Docker, database, or backend needed.

---

## 🔑 Default Test Accounts

| Role | Username / Reg Number | Password |
|---|---|---|
| **Student** | `21CS001` | `College@2024` |
| **Faculty** | `FAC001` | `College@2024` |

---

## 🛠️ Management Commands

```powershell
# View real-time container status
docker compose ps

# View backend logs
docker compose logs -f api1

# View compiler logs
docker compose logs -f judge0-server judge0-worker

# Rebuild only the backend after code changes
docker compose up -d --build api1 api2 api3 api4 worker1 worker2 worker3 worker4

# Restart NGINX (after rebuilding frontend)
docker compose restart nginx

# Stop all containers
docker compose down

# Stop and wipe database volume (clean reset)
docker compose down -v
```
