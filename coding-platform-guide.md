# Scalable AI-Driven Coding Assessment Platform
## Complete Project Guide — Node.js + NestJS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full Folder Structure](#2-full-folder-structure)
3. [Technology Stack & Licenses](#3-technology-stack--licenses)
4. [Security — Bcrypt Salting (Free, Commercial-Safe)](#4-security--bcrypt-salting-free-commercial-safe)
5. [Backend — NestJS Setup](#5-backend--nestjs-setup)
6. [Advanced Load Balancing (Netflix/Prime Style)](#6-advanced-load-balancing-netflixprime-style)
7. [NGINX Configuration](#7-nginx-configuration)
8. [Database — PostgreSQL + Encryption](#8-database--postgresql--encryption)
9. [Redis — Caching, Sessions, Queues](#9-redis--caching-sessions-queues)
10. [Code Execution Sandbox — Docker](#10-code-execution-sandbox--docker)
11. [AI Service Integration](#11-ai-service-integration)
12. [Frontend — React + Monaco Editor](#12-frontend--react--monaco-editor)
13. [Authentication & JWT](#13-authentication--jwt)
14. [Environment Variables](#14-environment-variables)
15. [Docker Compose — Full Stack](#15-docker-compose--full-stack)
16. [Deployment Checklist](#16-deployment-checklist)

---

## 1. Project Overview

This platform allows companies or institutions to:
- Create and host coding assessments
- Run submitted code in isolated sandboxes (multi-language)
- Get AI-powered hints, code reviews, and plagiarism detection
- Handle thousands of concurrent users with Netflix-grade load balancing

All software used is **free and open source**, cleared for commercial use.

---

## 2. Full Folder Structure

```
coding-platform/
│
├── backend/                          ← NestJS API server
│   ├── src/
│   │   ├── main.ts                   ← App entry point
│   │   ├── app.module.ts             ← Root module
│   │   │
│   │   ├── auth/                     ← Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/                    ← User management
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── user.entity.ts
│   │   │   └── dto/
│   │   │       └── create-user.dto.ts
│   │   │
│   │   ├── assessments/              ← Problem sets, tests
│   │   │   ├── assessments.module.ts
│   │   │   ├── assessments.controller.ts
│   │   │   ├── assessments.service.ts
│   │   │   ├── assessment.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-assessment.dto.ts
│   │   │       └── submit-solution.dto.ts
│   │   │
│   │   ├── submissions/              ← Code submission + results
│   │   │   ├── submissions.module.ts
│   │   │   ├── submissions.controller.ts
│   │   │   ├── submissions.service.ts
│   │   │   └── submission.entity.ts
│   │   │
│   │   ├── execution/                ← Code runner service
│   │   │   ├── execution.module.ts
│   │   │   ├── execution.service.ts  ← Dispatches to Docker sandbox
│   │   │   └── execution.processor.ts ← BullMQ job processor
│   │   │
│   │   ├── ai/                       ← AI hint + review service
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── ai.service.ts
│   │   │
│   │   ├── health/                   ← Health check endpoint
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts  ← GET /health → 200 OK
│   │   │
│   │   └── common/                   ← Shared utilities
│   │       ├── guards/
│   │       │   ├── jwt-auth.guard.ts
│   │       │   └── roles.guard.ts
│   │       ├── decorators/
│   │       │   └── roles.decorator.ts
│   │       ├── filters/
│   │       │   └── http-exception.filter.ts
│   │       └── interceptors/
│   │           └── logging.interceptor.ts
│   │
│   ├── test/                         ← E2E tests
│   ├── .env                          ← Environment variables (never commit)
│   ├── .env.example                  ← Template for env vars
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/                         ← React + TypeScript
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Assessment.tsx        ← Monaco Editor lives here
│   │   │   └── Results.tsx
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   └── CodeEditor.tsx    ← Monaco Editor component
│   │   │   ├── Layout/
│   │   │   └── UI/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useSubmission.ts
│   │   ├── services/
│   │   │   ├── api.ts                ← Axios instance + interceptors
│   │   │   └── websocket.ts          ← Real-time result streaming
│   │   └── store/                    ← Zustand / Redux state
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── sandbox/                          ← Code execution Docker images
│   ├── python/
│   │   └── Dockerfile
│   ├── javascript/
│   │   └── Dockerfile
│   ├── java/
│   │   └── Dockerfile
│   ├── cpp/
│   │   └── Dockerfile
│   └── runner.sh                     ← Execution script with timeouts
│
├── nginx/
│   ├── nginx.conf                    ← Main NGINX config (load balancer)
│   ├── conf.d/
│   │   └── coding-platform.conf      ← Server block config
│   └── ssl/                          ← Certs (Let's Encrypt)
│
├── docker-compose.yml                ← Full stack orchestration
├── docker-compose.prod.yml           ← Production overrides
├── .gitignore
└── README.md
```

---

## 3. Technology Stack & Licenses

| Package | Purpose | License | Commercial Use |
|---|---|---|---|
| Node.js | Runtime | MIT | Free |
| NestJS | Backend framework | MIT | Free |
| React | Frontend | MIT | Free |
| PostgreSQL | Primary database | PostgreSQL (MIT-like) | Free |
| Redis | Cache + queue | BSD-3 | Free |
| BullMQ | Job queue | MIT | Free |
| NGINX | Load balancer | BSD-2 | Free |
| bcrypt | Password hashing + salting | MIT | Free |
| jsonwebtoken | JWT auth | MIT | Free |
| Helmet | HTTP security headers | MIT | Free |
| TypeORM | ORM for PostgreSQL | MIT | Free |
| Docker | Container runtime | Apache 2.0 | Free |
| Let's Encrypt | SSL certificates | MIT/ISRG | Free |
| Monaco Editor | Code editor (VS Code's engine) | MIT | Free |
| class-validator | DTO validation | MIT | Free |
| passport | Auth middleware | MIT | Free |

**Every package above is free for commercial use. No royalties, no licensing fees.**

---

## 4. Security — Bcrypt Salting (Free, Commercial-Safe)

Bcrypt is the industry standard for password hashing. It automatically generates a unique **salt** per password, making rainbow table attacks impossible. The `cost factor` (work factor) controls how slow the hash is — slow is good for security.

### Install

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### users.service.ts — Hashing on register

```typescript
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const SALT_ROUNDS = 12; // Cost factor — higher = slower = more secure
                            // 12 is the recommended production value
                            // Takes ~300ms per hash, which is fine

    // bcrypt auto-generates a unique salt and embeds it in the hash
    // You never store the salt separately — it's IN the hash string
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      SALT_ROUNDS
    );

    // What gets stored in DB looks like:
    // $2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
    // ^  ^  ^--- 22 char salt embedded here    ^--- actual hash
    // |  |
    // |  cost factor (12)
    // bcrypt version

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    // bcrypt.compare extracts the salt from the stored hash automatically
    // and re-hashes the plain password with that same salt for comparison
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
```

### Why bcrypt over MD5/SHA256

```
MD5("password123")   = "482c811da5d5b4bc6d497ffa98491e38"  ← Same every time
MD5("password123")   = "482c811da5d5b4bc6d497ffa98491e38"  ← Attacker builds table

bcrypt("password123") = "$2b$12$abc...xyz"   ← Unique salt baked in
bcrypt("password123") = "$2b$12$def...uvw"   ← Different every time
                                               ← Rainbow tables useless
```

---

## 5. Backend — NestJS Setup

### Install dependencies

```bash
npm install -g @nestjs/cli
nest new backend
cd backend

# Core
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install @nestjs/bull bull ioredis
npm install @nestjs/config
npm install bcrypt helmet class-validator class-transformer

# Types
npm install -D @types/bcrypt @types/passport-jwt @types/passport-local @types/bull
```

### main.ts — Bootstrap with security

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (free, MIT)
  app.use(helmet());

  // Auto-validate all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — allow only your frontend domain
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 3000);
  console.log(`API running on port ${process.env.PORT || 3000}`);
}

bootstrap();
```

### app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ExecutionModule } from './execution/execution.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Load .env
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: +config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,   // Use migrations in production
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
      inject: [ConfigService],
    }),

    // Redis queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST'),
          port: +config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    AssessmentsModule,
    SubmissionsModule,
    ExecutionModule,
    AiModule,
    HealthModule,
  ],
})
export class AppModule {}
```

---

## 6. Advanced Load Balancing (Netflix/Prime Style)

Netflix and Amazon Prime use several layers of load balancing beyond basic round-robin. Here is how to implement the same patterns.

### Layer 1 — NGINX at the edge (covered in section 7)

Handles SSL termination, rate limiting, initial request distribution.

### Layer 2 — Sticky sessions via Redis (Session Affinity)

When a user is mid-assessment, you want their WebSocket and API calls to prefer the same instance. Redis shared sessions make this work across all instances.

```typescript
// sessions.middleware.ts
import * as session from 'express-session';
import * as RedisStore from 'connect-redis';
import { createClient } from 'redis';

export function setupSession(app) {
  const redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
    },
    password: process.env.REDIS_PASSWORD,
  });

  redisClient.connect();

  const store = new (RedisStore(session))({ client: redisClient });

  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,       // HTTPS only
        httpOnly: true,     // No JS access (XSS protection)
        maxAge: 1000 * 60 * 60 * 8,  // 8 hours
        sameSite: 'strict',
      },
    }),
  );
}
```

### Layer 3 — Circuit Breaker Pattern (Netflix Hystrix style)

Prevents one failing service (e.g. AI service) from cascading failures to the whole platform. Install `opossum` (MIT licensed, free):

```bash
npm install opossum
npm install -D @types/opossum
```

```typescript
// ai.service.ts — with circuit breaker
import * as CircuitBreaker from 'opossum';

@Injectable()
export class AiService {
  private breaker: CircuitBreaker;

  constructor() {
    // Wrap the AI API call in a circuit breaker
    this.breaker = new CircuitBreaker(this.callAiApi.bind(this), {
      timeout: 5000,          // If AI takes > 5s, fail fast
      errorThresholdPercentage: 50,  // Open circuit if 50% of calls fail
      resetTimeout: 30000,    // Try again after 30s
    });

    this.breaker.fallback(() => ({
      hint: 'AI service temporarily unavailable. Check your logic manually.',
    }));

    this.breaker.on('open', () =>
      console.warn('Circuit OPEN — AI service unreachable'),
    );
    this.breaker.on('close', () =>
      console.log('Circuit CLOSED — AI service recovered'),
    );
  }

  async getHint(code: string, problemId: string) {
    return this.breaker.fire({ code, problemId });
  }

  private async callAiApi(payload: { code: string; problemId: string }) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Review this code and give one helpful hint without revealing the answer:\n\n${payload.code}`,
          },
        ],
      }),
    });
    return response.json();
  }
}
```

### Layer 4 — Async Job Queue (Prime Video style)

Code execution is offloaded to a Bull queue so the API never blocks. Workers process jobs independently — you can scale workers separately from the API.

```typescript
// execution.service.ts — enqueue job
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ExecutionService {
  constructor(
    @InjectQueue('code-execution') private executionQueue: Queue,
  ) {}

  async submitCode(submissionId: string, code: string, language: string) {
    const job = await this.executionQueue.add(
      'run-code',
      { submissionId, code, language },
      {
        attempts: 3,          // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000,        // 2s, 4s, 8s between retries
        },
        removeOnComplete: true,
        timeout: 30000,       // Kill job after 30s
      },
    );
    return { jobId: job.id };
  }
}

// execution.processor.ts — process job
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('code-execution')
export class ExecutionProcessor {
  @Process('run-code')
  async handleExecution(job: Job) {
    const { submissionId, code, language } = job.data;

    // Run in Docker sandbox (see section 10)
    const result = await this.runInSandbox(code, language);

    // Update submission result in DB
    await this.submissionsService.updateResult(submissionId, result);

    return result;
  }
}
```

### Layer 5 — Health Checks (Load Balancer Aware)

NGINX removes unhealthy instances from the pool automatically if they fail `/health`.

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private db: Connection,
    // inject redis too if needed
  ) {}

  @Get()
  async check() {
    // Check DB connectivity
    await this.db.query('SELECT 1');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

---

## 7. NGINX Configuration

### nginx/conf.d/coding-platform.conf

```nginx
# Upstream pool — least_conn is Netflix's choice for variable workloads
upstream coding_api {
    least_conn;

    server api1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api3:3000 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;   # login: 5/min
limit_req_zone $binary_remote_addr zone=api:10m   rate=60r/m;  # API: 60/min
limit_req_zone $binary_remote_addr zone=submit:10m rate=10r/m; # submit: 10/min

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL termination
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS — tells browsers to always use HTTPS
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy no-referrer-when-downgrade;

    # Serve React frontend
    location / {
        root /var/www/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass         http://coding_api;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # WebSocket — for real-time code output streaming
    location /api/ws/ {
        proxy_pass         http://coding_api;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_read_timeout 3600s;     # Keep WS open for 1 hour
    }

    # Stricter rate limit on login to prevent brute force
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://coding_api;
        proxy_http_version 1.1;
        proxy_set_header Host            $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Strict limit on code submission
    location /api/submissions {
        limit_req zone=submit burst=5 nodelay;
        proxy_pass         http://coding_api;
        proxy_http_version 1.1;
        proxy_read_timeout 120s;
    }
}
```

---

## 8. Database — PostgreSQL + Encryption

### Key entities

```typescript
// user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;   // bcrypt hash — never plain text

  @Column({ default: 'student' })
  role: 'student' | 'admin' | 'recruiter';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// submission.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn
} from 'typeorm';
import { User } from '../users/user.entity';
import { Assessment } from '../assessments/assessment.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Assessment)
  assessment: Assessment;

  @Column('text')
  code: string;       // Consider column-level encryption for sensitive code

  @Column({ default: 'pending' })
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';

  @Column('jsonb', { nullable: true })
  testResults: object;

  @Column({ nullable: true })
  executionTime: number;  // ms

  @Column({ nullable: true })
  memoryUsed: number;     // KB

  @CreateDateColumn()
  submittedAt: Date;
}
```

### Enable AES-256 at-rest encryption in PostgreSQL (pgcrypto)

```sql
-- Run once in your DB to enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: encrypt sensitive code columns
UPDATE submissions
SET code = pgp_sym_encrypt(code, 'your-strong-aes-key')
WHERE code IS NOT NULL;

-- Read decrypted
SELECT pgp_sym_decrypt(code::bytea, 'your-strong-aes-key')
FROM submissions
WHERE id = 'submission-uuid';
```

On AWS RDS, enable storage encryption at instance creation — this encrypts the entire disk with AES-256 automatically, managed by AWS KMS.

---

## 9. Redis — Caching, Sessions, Queues

```typescript
// cache.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // Cache assessment problems (they don't change often)
  async cacheAssessment(id: string, data: object): Promise<void> {
    await this.redis.setex(
      `assessment:${id}`,
      3600,                      // expire in 1 hour
      JSON.stringify(data),
    );
  }

  async getAssessment(id: string): Promise<object | null> {
    const cached = await this.redis.get(`assessment:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Track active submissions per user (prevent duplicate runs)
  async setRunning(userId: string): Promise<void> {
    await this.redis.setex(`running:${userId}`, 60, '1');
  }

  async isRunning(userId: string): Promise<boolean> {
    return (await this.redis.exists(`running:${userId}`)) === 1;
  }

  async clearRunning(userId: string): Promise<void> {
    await this.redis.del(`running:${userId}`);
  }
}
```

---

## 10. Code Execution Sandbox — Docker

### sandbox/runner.sh

```bash
#!/bin/bash
# This script runs inside a Docker container
# Called with: ./runner.sh <language> <file> <timeout_seconds>

LANGUAGE=$1
FILE=$2
TIMEOUT=${3:-5}

case $LANGUAGE in
  python)
    timeout $TIMEOUT python3 $FILE
    ;;
  javascript)
    timeout $TIMEOUT node $FILE
    ;;
  java)
    timeout $TIMEOUT sh -c "javac $FILE && java $(basename $FILE .java)"
    ;;
  cpp)
    timeout $TIMEOUT sh -c "g++ -o /tmp/out $FILE && /tmp/out"
    ;;
  *)
    echo "Unsupported language: $LANGUAGE"
    exit 1
    ;;
esac
```

### sandbox/python/Dockerfile

```dockerfile
FROM python:3.11-slim

# No network access, no privilege escalation
RUN useradd -m -s /bin/sh sandbox
USER sandbox
WORKDIR /sandbox

COPY runner.sh /runner.sh
```

### execution.processor.ts — Run code in Docker

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

@Processor('code-execution')
export class ExecutionProcessor {
  async runInSandbox(
    code: string,
    language: string,
    timeoutMs = 5000,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {

    // Write code to temp file
    const tmpDir = `/tmp/submissions/${Date.now()}`;
    await fs.mkdir(tmpDir, { recursive: true });
    const ext = { python: 'py', javascript: 'js', java: 'java', cpp: 'cpp' };
    const filePath = path.join(tmpDir, `solution.${ext[language]}`);
    await fs.writeFile(filePath, code);

    try {
      // Run in isolated Docker container
      // --network none   — no internet access
      // --memory 256m    — memory cap
      // --cpus 0.5       — CPU cap
      // --rm             — auto-remove after done
      // --read-only      — read-only filesystem
      const dockerCmd = [
        'docker run',
        '--rm',
        '--network none',
        '--memory 256m',
        '--cpus 0.5',
        '--read-only',
        `--volume ${tmpDir}:/sandbox:ro`,
        `coding-sandbox-${language}`,
        `/runner.sh ${language} /sandbox/solution.${ext[language]} 5`,
      ].join(' ');

      const { stdout, stderr } = await execAsync(dockerCmd, {
        timeout: timeoutMs + 1000,
      });

      return { stdout, stderr, exitCode: 0 };

    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: error.code || 1,
      };
    } finally {
      // Clean up temp files
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
```

---

## 11. AI Service Integration

```typescript
// ai.service.ts
@Injectable()
export class AiService {
  async reviewCode(code: string, problem: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are a coding assessment assistant.
                 Give constructive feedback on code quality,
                 time complexity, and edge cases.
                 Do NOT give away the solution directly.`,
        messages: [
          {
            role: 'user',
            content: `Problem: ${problem}\n\nStudent's code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide a brief review.`,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }

  async checkPlagiarism(
    submission1: string,
    submission2: string,
  ): Promise<{ score: number; explanation: string }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `Compare these two code submissions for plagiarism.
                      Return JSON: { "score": 0-100, "explanation": "..." }
                      Score 0 = completely different, 100 = identical.
                      
                      Submission 1:\n${submission1}
                      
                      Submission 2:\n${submission2}`,
          },
        ],
      }),
    });

    const data = await response.json();
    return JSON.parse(data.content[0].text);
  }
}
```

---

## 12. Frontend — React + Monaco Editor

### Install

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @monaco-editor/react axios zustand react-router-dom
```

### components/Editor/CodeEditor.tsx

```typescript
import Editor from '@monaco-editor/react';
import { useState } from 'react';

interface CodeEditorProps {
  onSubmit: (code: string, language: string) => void;
  isSubmitting: boolean;
}

export function CodeEditor({ onSubmit, isSubmitting }: CodeEditorProps) {
  const [code, setCode] = useState('# Write your solution here\n');
  const [language, setLanguage] = useState('python');

  const languages = ['python', 'javascript', 'java', 'cpp'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {languages.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <Editor
        height="400px"
        language={language === 'cpp' ? 'cpp' : language}
        value={code}
        onChange={(value) => setCode(value || '')}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />

      <button
        onClick={() => onSubmit(code, language)}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Running...' : 'Submit Solution'}
      </button>
    </div>
  );
}
```

### services/api.ts

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## 13. Authentication & JWT

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '8h',
        secret: process.env.JWT_SECRET,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
```

```typescript
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

---

## 14. Environment Variables

### backend/.env.example

```bash
# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Database (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_USER=platform_user
DB_PASS=your-strong-db-password
DB_NAME=coding_platform

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=your-256-bit-secret-here

# Session — generate with: openssl rand -hex 32
SESSION_SECRET=your-session-secret-here

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Encryption key for column-level encryption
DB_ENCRYPTION_KEY=your-aes-256-key-32-chars-exactly
```

---

## 15. Docker Compose — Full Stack

### docker-compose.yml

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/letsencrypt:ro
      - ./frontend/dist:/var/www/dist:ro
    depends_on:
      - api1
      - api2
      - api3
    restart: unless-stopped

  api1:
    build: ./backend
    environment:
      PORT: 3000
    env_file: ./backend/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  api2:
    build: ./backend
    environment:
      PORT: 3000
    env_file: ./backend/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  api3:
    build: ./backend
    environment:
      PORT: 3000
    env_file: ./backend/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: platform_user
      POSTGRES_PASSWORD: your-strong-db-password
      POSTGRES_DB: coding_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your-redis-password --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Code execution workers (scale independently)
  worker1:
    build: ./backend
    command: node dist/execution/worker.js
    env_file: ./backend/.env
    depends_on:
      - redis
      - postgres
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Needed to spawn Docker containers
    restart: unless-stopped

  worker2:
    build: ./backend
    command: node dist/execution/worker.js
    env_file: ./backend/.env
    depends_on:
      - redis
      - postgres
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 16. Deployment Checklist

### Before going live

```
Security
  [ ] JWT_SECRET is at least 64 random characters
  [ ] SESSION_SECRET is at least 32 random characters
  [ ] DB password is strong and unique
  [ ] Redis password set
  [ ] .env file is in .gitignore — never committed
  [ ] SSL certificate installed (Let's Encrypt)
  [ ] HTTPS redirect enabled in NGINX
  [ ] bcrypt cost factor set to 12 in production
  [ ] All Docker sandbox containers run as non-root user
  [ ] Sandbox containers have --network none

Database
  [ ] Storage encryption enabled (AWS RDS checkbox or pgcrypto)
  [ ] Database not publicly accessible (VPC / private subnet)
  [ ] Regular automated backups enabled
  [ ] Migrations run (not synchronize: true in TypeORM)

Load Balancing
  [ ] At least 3 API instances running
  [ ] Health check endpoint /health returns 200
  [ ] NGINX upstream uses least_conn
  [ ] max_fails and fail_timeout set on upstream servers
  [ ] Rate limiting configured on /api/auth/login

Performance
  [ ] Redis caching for assessments enabled
  [ ] Static frontend served by NGINX directly (not proxied)
  [ ] keepalive 64 set in NGINX upstream block
  [ ] Code execution jobs go through Bull queue (not inline)

Monitoring (recommended additions)
  [ ] PM2 or similar process manager for Node.js instances
  [ ] Centralised logging (Winston + ELK stack or Datadog)
  [ ] Uptime monitoring (UptimeRobot — free tier available)
  [ ] Error tracking (Sentry — free tier available)
```

### Quick start commands

```bash
# Clone and setup
git clone <your-repo>
cd coding-platform
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Build sandbox images
docker build -t coding-sandbox-python ./sandbox/python
docker build -t coding-sandbox-javascript ./sandbox/javascript

# Start everything
docker compose up -d

# Check all services running
docker compose ps

# View API logs
docker compose logs -f api1

# Scale API instances if needed
docker compose up -d --scale api1=2
```

---

*All packages listed are MIT or BSD licensed and free for commercial use.*
*No per-user fees, no royalties, no licensing restrictions.*
