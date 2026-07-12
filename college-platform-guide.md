# College Coding Assessment Platform
## Complete Project Guide — NestJS + React + Ollama (DeepSeek) + RAG (ChromaDB)
### LeetCode-style platform adapted for college environment

---

## Table of Contents

1. [What This Adds to the Original Guide](#1-what-this-adds)
2. [Complete Updated Folder Structure](#2-folder-structure)
3. [Full Technology Stack](#3-technology-stack)
4. [Student Entity — Reg Number Based](#4-student-entity)
5. [Developer Bulk Import — Pre-loading Students](#5-developer-bulk-import)
6. [Authentication — Reg No Login + Change Password](#6-authentication)
7. [RAG Module — ChromaDB + DeepSeek Embeddings](#7-rag-module)
8. [Question Generator Module](#8-question-generator)
9. [Submission + Execution Flow](#9-submission-and-execution)
10. [Grading Module — Auto-grade with AI](#10-grading-module)
11. [Results Download — PDF Generation](#11-results-download)
12. [Student Profile + Progress Tracking](#12-student-profile-and-progress)
13. [Frontend — LeetCode-style UI](#13-frontend)
14. [Updated Docker Sandbox — All Languages](#14-docker-sandbox)
15. [Ollama Setup — DeepSeek on Laptop + Server](#15-ollama-setup)
16. [Updated Docker Compose](#16-docker-compose)
17. [Seed Script — Bootstrap ChromaDB](#17-seed-script)
18. [Environment Variables](#18-environment-variables)
19. [Faculty Dashboard](#19-faculty-dashboard)
20. [Deployment Checklist](#20-deployment-checklist)

---

## 1. What This Adds

| Feature | Original Guide | This Guide |
|---|---|---|
| Login | Email + password | College Reg No (21CS001) + password |
| Student creation | Self-register | Developer bulk imports via admin API / CSV |
| Default password | Set by user | Common default, reset by student later |
| Change password | Not included | Dedicated flow after first login |
| Questions | Faculty typed | AI generated via RAG + DeepSeek |
| AI model | Anthropic (paid) | Ollama DeepSeek (free, runs locally) |
| Languages | Python, JS, Java, C++ | + C, HTML, R, CSS |
| Difficulty | None | Easy / Medium / Hard with enforced rules |
| Grading | Basic | Deterministic test cases + AI quality review |
| Result download | None | PDF download with full report |
| Student profile | None | Progress dashboard, streak, history |
| Faculty panel | None | All scores, filters, CSV export |

---

## 2. Complete Updated Folder Structure

```
college-coding-platform/
│
├── backend/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       │
│       ├── auth/                         ← UPDATED: reg no login, change password
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── jwt.strategy.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       └── change-password.dto.ts
│       │
│       ├── users/                        ← UPDATED: student entity, bulk import
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   ├── user.entity.ts
│       │   └── dto/
│       │       ├── bulk-import.dto.ts
│       │       └── update-profile.dto.ts
│       │
│       ├── rag/                          ← NEW: ChromaDB + embeddings
│       │   ├── rag.module.ts
│       │   ├── rag.service.ts
│       │   └── chroma.client.ts
│       │
│       ├── questions/                    ← NEW: AI question generation
│       │   ├── questions.module.ts
│       │   ├── questions.controller.ts
│       │   ├── questions.service.ts
│       │   ├── question.entity.ts
│       │   └── dto/
│       │       └── generate-question.dto.ts
│       │
│       ├── submissions/                  ← UPDATED: full submission + grading
│       │   ├── submissions.module.ts
│       │   ├── submissions.controller.ts
│       │   ├── submissions.service.ts
│       │   └── submission.entity.ts
│       │
│       ├── grading/                      ← NEW: deterministic + AI grading
│       │   ├── grading.module.ts
│       │   └── grading.service.ts
│       │
│       ├── execution/                    ← UPDATED: 8 language sandboxes
│       │   ├── execution.module.ts
│       │   ├── execution.service.ts
│       │   └── execution.processor.ts
│       │
│       ├── results/                      ← NEW: PDF download
│       │   ├── results.module.ts
│       │   ├── results.controller.ts
│       │   └── results.service.ts        ← generates PDF with pdfkit
│       │
│       ├── progress/                     ← NEW: student progress tracking
│       │   ├── progress.module.ts
│       │   ├── progress.controller.ts
│       │   └── progress.service.ts
│       │
│       ├── faculty/                      ← NEW: faculty dashboard API
│       │   ├── faculty.module.ts
│       │   ├── faculty.controller.ts
│       │   └── faculty.service.ts
│       │
│       ├── ai/                           ← UPDATED: uses Ollama instead of Anthropic
│       │   ├── ai.module.ts
│       │   └── ai.service.ts
│       │
│       └── common/
│           ├── guards/
│           │   ├── jwt-auth.guard.ts
│           │   └── roles.guard.ts
│           └── decorators/
│               └── roles.decorator.ts
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx                 ← UPDATED: reg number field
│       │   ├── Dashboard.tsx             ← UPDATED: language + difficulty selector
│       │   ├── Assessment.tsx            ← UPDATED: question panel + countdown timer
│       │   ├── Results.tsx               ← UPDATED: AI feedback + download button
│       │   ├── Profile.tsx               ← NEW: progress, history, streaks
│       │   ├── ChangePassword.tsx        ← NEW: first login password reset
│       │   └── FacultyDashboard.tsx      ← NEW: admin/faculty view
│       └── components/
│           ├── QuestionPanel/
│           ├── DifficultyBadge/
│           ├── ProgressChart/
│           └── ScoreCard/
│
├── sandbox/
│   ├── python/Dockerfile
│   ├── javascript/Dockerfile
│   ├── java/Dockerfile
│   ├── cpp/Dockerfile
│   ├── c/Dockerfile                      ← NEW
│   ├── r/Dockerfile                      ← NEW
│   ├── html/Dockerfile                   ← NEW
│   └── runner.sh                         ← UPDATED: all 8 languages
│
├── scripts/
│   ├── seed-vector-store.ts              ← NEW: bootstrap ChromaDB
│   └── bulk-import-students.ts           ← NEW: CSV import tool
│
├── nginx/
├── docker-compose.yml                    ← UPDATED: + Ollama + ChromaDB
└── docker-compose.prod.yml
```

---

## 3. Full Technology Stack

| Package | Purpose | License | Cost |
|---|---|---|---|
| NestJS | Backend framework | MIT | Free |
| React + Vite | Frontend | MIT | Free |
| PostgreSQL + TypeORM | Database + ORM | PostgreSQL/MIT | Free |
| Redis + BullMQ | Cache + job queue | BSD/MIT | Free |
| NGINX | Load balancer | BSD | Free |
| bcrypt | Password hashing | MIT | Free |
| JWT + Passport | Authentication | MIT | Free |
| Monaco Editor | VS Code editor engine | MIT | Free |
| Docker | Container runtime | Apache 2.0 | Free |
| **Ollama** | Run AI models locally | MIT | **Free** |
| **deepseek-coder:6.7b** | Question generation + grading | Apache 2.0 | **Free** |
| **nomic-embed-text** | RAG embeddings | Apache 2.0 | **Free** |
| **chromadb** | Vector database for RAG | Apache 2.0 | **Free** |
| **pdfkit** | PDF result generation | MIT | **Free** |
| Helmet | HTTP security headers | MIT | Free |
| class-validator | DTO validation | MIT | Free |

**Total external AI cost: $0. Everything runs on your own hardware.**

---

## 4. Student Entity — Reg Number Based

### Install new packages

```bash
cd backend
npm install chromadb pdfkit @types/pdfkit uuid
npm install -D @types/uuid
```

### user.entity.ts (complete replacement)

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMIN   = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // e.g. 21CS001, 22IT045, 23ECE112
  @Column({ unique: true, length: 20 })
  regNumber: string;

  @Column({ length: 100 })
  name: string;

  // CS, IT, ECE, MECH, etc.
  @Column({ length: 20 })
  department: string;

  // 1, 2, 3, or 4
  @Column({ type: 'int' })
  year: number;

  @Column()
  password: string; // bcrypt hashed

  // Developer sets this to true when bulk importing
  // Student must change password on first login when true
  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  // Tracks total assessments taken, score history, streaks
  @Column({ type: 'int', default: 0 })
  totalAssessments: number;

  @Column({ type: 'int', default: 0 })
  totalPassed: number;

  @Column({ type: 'float', default: 0 })
  averageScore: number;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;  // consecutive days with at least one submission

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ type: 'date', nullable: true })
  lastSubmissionDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 5. Developer Bulk Import — Pre-loading Students

The developer does NOT use the public registration form.
Instead, they use a protected admin-only API or run a CLI script.

### bulk-import.dto.ts

```typescript
import { IsString, IsInt, Min, Max, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleStudentDto {
  // Format: 2-digit year + 2-4 letter dept + 3-digit number
  @IsString()
  @Matches(/^\d{2}[A-Z]{2,4}\d{3}$/, {
    message: 'regNumber must be like 21CS001 or 22ECE045'
  })
  regNumber: string;

  @IsString()
  name: string;

  @IsString()
  department: string;

  @IsInt() @Min(1) @Max(4)
  year: number;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleStudentDto)
  students: SingleStudentDto[];

  // The common default password for all imported students
  // Students change this on first login
  @IsString()
  defaultPassword: string;
}
```

### users.service.ts — bulk import method

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { BulkImportDto } from './dto/bulk-import.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // Used by developers/admin to bulk-create student accounts
  async bulkImport(dto: BulkImportDto): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const hashedPassword = await bcrypt.hash(dto.defaultPassword, 12);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const s of dto.students) {
      try {
        // Skip if reg number already exists (safe to re-run)
        const existing = await this.usersRepo.findOne({
          where: { regNumber: s.regNumber }
        });

        if (existing) {
          skipped++;
          continue;
        }

        const user = this.usersRepo.create({
          regNumber:          s.regNumber,
          name:               s.name,
          department:         s.department,
          year:               s.year,
          password:           hashedPassword,
          mustChangePassword: true,  // Force password change on first login
          role:               'student',
        });

        await this.usersRepo.save(user);
        imported++;
      } catch (err) {
        errors.push(`${s.regNumber}: ${err.message}`);
      }
    }

    return { imported, skipped, errors };
  }

  async findByRegNumber(regNumber: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { regNumber } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async updatePassword(userId: string, newHashedPassword: string): Promise<void> {
    await this.usersRepo.update(userId, {
      password:           newHashedPassword,
      mustChangePassword: false,
    });
  }

  async updateProgressStats(
    userId: string,
    passed: boolean,
    score: number,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.lastSubmissionDate
      ? new Date(user.lastSubmissionDate).toISOString().split('T')[0]
      : null;

    // Calculate streak
    let newStreak = user.currentStreak;
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        newStreak = user.currentStreak + 1;  // Consecutive day
      } else {
        newStreak = 1;  // Streak broken, restart
      }
    }

    const newTotal      = user.totalAssessments + 1;
    const newPassed     = user.totalPassed + (passed ? 1 : 0);
    const newAvgScore   = ((user.averageScore * user.totalAssessments) + score) / newTotal;
    const newLongest    = Math.max(user.longestStreak, newStreak);

    await this.usersRepo.update(userId, {
      totalAssessments:   newTotal,
      totalPassed:        newPassed,
      averageScore:       Math.round(newAvgScore * 100) / 100,
      currentStreak:      newStreak,
      longestStreak:      newLongest,
      lastSubmissionDate: new Date(),
    });
  }
}
```

### users.controller.ts — bulk import endpoint (admin only)

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../common/guards/roles.guard';
import { Roles }        from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { BulkImportDto } from './dto/bulk-import.dto';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST /api/users/bulk-import
  // Protected: admin role only
  // Developer calls this with the student list JSON or via the seed script
  @Post('bulk-import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async bulkImport(@Body() dto: BulkImportDto) {
    return this.usersService.bulkImport(dto);
  }
}
```

### CLI seed script for developer use

```typescript
// scripts/bulk-import-students.ts
// Run: npx ts-node scripts/bulk-import-students.ts

const students = [
  { regNumber: '21CS001', name: 'Arun Kumar',    department: 'CS', year: 3 },
  { regNumber: '21CS002', name: 'Priya Sharma',  department: 'CS', year: 3 },
  { regNumber: '21IT001', name: 'Rahul Singh',   department: 'IT', year: 3 },
  // Add all students here...
];

async function importStudents() {
  const response = await fetch('http://localhost:3000/api/users/bulk-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_JWT_TOKEN}`,
    },
    body: JSON.stringify({
      students,
      defaultPassword: 'College@2024',  // Students must change this on first login
    }),
  });

  const result = await response.json();
  console.log(`Imported: ${result.imported}`);
  console.log(`Skipped (already exists): ${result.skipped}`);
  if (result.errors.length > 0) console.log('Errors:', result.errors);
}

importStudents();
```

---

## 6. Authentication — Reg No Login + Change Password

### auth.service.ts (complete)

```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService }   from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService:   JwtService,
  ) {}

  async login(regNumber: string, password: string) {
    // Find student by reg number (not email)
    const user = await this.usersService.findByRegNumber(regNumber.toUpperCase());

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub:        user.id,
      regNumber:  user.regNumber,
      name:       user.name,
      role:       user.role,
      department: user.department,
      year:       user.year,
      // Tell frontend if this user needs to change password
      mustChangePassword: user.mustChangePassword,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '8h',
        secret:    process.env.JWT_SECRET,
      }),
      user: {
        id:                 user.id,
        regNumber:          user.regNumber,
        name:               user.name,
        role:               user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // Student-initiated password change (after first login or anytime)
  async changePassword(
    userId:      string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashed);
  }
}
```

### auth.controller.ts

```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService }  from './auth.service';

export class LoginDto {
  regNumber: string;
  password:  string;
}

export class ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/auth/login
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.regNumber, dto.password);
  }

  // POST /api/auth/change-password
  // Student must be logged in (JWT required)
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
```

---

## 7. RAG Module — ChromaDB + DeepSeek Embeddings

RAG works in 3 steps:
1. Student selects language + difficulty → system builds a search query
2. Query is embedded via nomic-embed-text → searches ChromaDB for similar past questions
3. Top 3 similar questions injected as context → DeepSeek generates a fresh, original question

### chroma.client.ts

```typescript
import { ChromaClient } from 'chromadb';

// Connects to ChromaDB running as a Docker service
export const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://chroma:8000',
});
```

### rag.service.ts

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { chromaClient } from './chroma.client';
import { Collection } from 'chromadb';

export interface QuestionContext {
  problemStatement: string;
  difficulty:       string;
  language:         string;
}

@Injectable()
export class RagService implements OnModuleInit {
  private collection: Collection;
  private readonly logger = new Logger(RagService.name);

  async onModuleInit() {
    // Connect to (or create) the questions collection in ChromaDB
    // ChromaDB handles embedding automatically via nomic-embed-text
    this.collection = await chromaClient.getOrCreateCollection({
      name:     'coding_questions',
      metadata: { description: 'College coding assessment question bank' },
    });

    const count = await this.collection.count();
    this.logger.log(`ChromaDB ready. Question bank size: ${count}`);
  }

  // Retrieve top-K similar questions for given language + difficulty
  async getSimilarQuestions(
    language:   string,
    difficulty: string,
    topK = 3,
  ): Promise<QuestionContext[]> {
    const queryText = `${difficulty} difficulty ${language} programming question problem`;

    try {
      // Filter by BOTH language and difficulty for precise retrieval
      const results = await this.collection.query({
        queryTexts: [queryText],
        nResults:   topK,
        where: {
          $and: [
            { language:   { $eq: language.toLowerCase() } },
            { difficulty: { $eq: difficulty.toLowerCase() } },
          ],
        },
      });

      if (results.documents[0]?.length > 0) {
        return results.documents[0].map((doc, i) => ({
          problemStatement: doc || '',
          difficulty: (results.metadatas[0]?.[i]?.difficulty as string) || difficulty,
          language:   (results.metadatas[0]?.[i]?.language   as string) || language,
        }));
      }
    } catch {
      // If filtered search fails, fall back to unfiltered
    }

    // Fallback: search without filters
    const fallback = await this.collection.query({
      queryTexts: [queryText],
      nResults:   topK,
    });

    return (fallback.documents[0] || []).map((doc, i) => ({
      problemStatement: doc || '',
      difficulty: (fallback.metadatas[0]?.[i]?.difficulty as string) || difficulty,
      language:   (fallback.metadatas[0]?.[i]?.language   as string) || language,
    }));
  }

  // Add generated question back into ChromaDB — bank grows over time
  async addQuestion(
    id:               string,
    problemStatement: string,
    language:         string,
    difficulty:       string,
  ): Promise<void> {
    await this.collection.add({
      ids:       [id],
      documents: [problemStatement],
      metadatas: [{ language: language.toLowerCase(), difficulty: difficulty.toLowerCase() }],
    });
  }

  async getCollectionSize(): Promise<number> {
    return this.collection.count();
  }
}
```

### rag.module.ts

```typescript
import { Module } from '@nestjs/common';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  exports:   [RagService],
})
export class RagModule {}
```

---

## 8. Question Generator Module

### question.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  language: string;

  @Column()
  difficulty: string;   // easy | medium | hard

  @Column('text')
  problemStatement: string;

  @Column('text')
  constraints: string;

  @Column('text')
  sampleInput: string;

  @Column('text')
  sampleOutput: string;

  // Hidden from student — used only during grading
  // Stored as JSON array: [{ input: string, expectedOutput: string }]
  @Column('jsonb')
  testCases: { input: string; expectedOutput: string }[];

  @Column({ default: 45 })
  timeLimitMinutes: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### questions.service.ts (complete with difficulty rules)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagService } from '../rag/rag.service';
import { Question } from './question.entity';

// Strict difficulty definitions injected into every generation prompt
const DIFFICULTY_RULES = {
  easy: `
- Single concept only (loops, basic conditions, simple string/array operations)
- No complex data structures required
- Expected time complexity: O(n) or O(1)
- Suitable for: first or second year students
- Example topics: sum of array elements, check if palindrome, count vowels, reverse string, factorial
- Test cases should be simple and predictable`,

  medium: `
- Two concepts combined (e.g. arrays + hashing, strings + sorting)
- May use: lists, dictionaries/maps, stacks, basic sorting
- Expected time complexity: O(n log n) is acceptable
- Suitable for: second or third year students
- Example topics: two-sum problem, anagram check, find duplicates, matrix operations, simple recursion
- At least one edge case in test cases`,

  hard: `
- Algorithmic thinking required (dynamic programming, graph traversal, backtracking, binary search)
- Complex data structures expected: trees, graphs, heaps, tries
- Optimal time complexity expected — brute force must time out on large inputs
- Suitable for: third or fourth year students
- Example topics: longest common subsequence, shortest path, coin change, N-queens, merge intervals
- Multiple tricky edge cases in test cases`,
};

// Language-specific generation instructions
const LANGUAGE_NOTES: Record<string, string> = {
  python:     'Python 3. No external libraries. Use input() for stdin, print() for stdout.',
  java:       'Java 11+. Class named Solution with public static void main(String[] args). Use Scanner for input.',
  cpp:        'C++17. Include necessary headers (iostream, vector, string, etc). Use cin/cout.',
  c:          'C99. Include necessary headers (stdio.h, stdlib.h, string.h). Use scanf/printf.',
  javascript: 'Node.js (ES2020). Use process.stdin for input, console.log for output. No browser APIs.',
  html:       'Valid HTML5 page. CSS may be inline or in <style> tag. Task should involve creating a specific UI structure.',
  css:        'Write CSS rules targeting provided HTML structure. Focus on layout, colors, or responsive design.',
  r:          'Base R only. No external packages. Use readline() for input, print()/cat() for output.',
};

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    @InjectRepository(Question)
    private questionsRepo: Repository<Question>,
    private ragService: RagService,
  ) {}

  async generateQuestion(language: string, difficulty: string): Promise<Question> {
    // STEP 1: Retrieve context from ChromaDB via RAG
    const similar = await this.ragService.getSimilarQuestions(language, difficulty, 3);

    const contextBlock = similar.length > 0
      ? `Use these ${similar.length} examples ONLY as style/difficulty reference.\nGenerate a COMPLETELY DIFFERENT and ORIGINAL question:\n\n` +
        similar.map((q, i) => `--- Example ${i + 1} ---\n${q.problemStatement}`).join('\n\n')
      : 'No examples available. Generate a fresh original question.';

    // STEP 2: Build generation prompt
    const prompt = `You are a college programming assessment question generator.

TASK: Generate ONE original coding question.

LANGUAGE: ${language.toUpperCase()}
LANGUAGE INSTRUCTIONS:
${LANGUAGE_NOTES[language] || 'Standard implementation.'}

DIFFICULTY: ${difficulty.toUpperCase()}
DIFFICULTY RULES:
${DIFFICULTY_RULES[difficulty]}

REFERENCE EXAMPLES (DO NOT COPY — use for style reference only):
${contextBlock}

RESPONSE FORMAT: Return ONLY a valid JSON object, no markdown, no explanation, no preamble.

{
  "problemStatement": "Clear, detailed problem description. Explain exactly what input is given and what output is expected.",
  "constraints": "e.g. 1 <= n <= 1000, string length <= 100, all values are positive integers",
  "sampleInput": "One representative input example",
  "sampleOutput": "Exact expected output for the sample input",
  "testCases": [
    { "input": "basic test",     "expectedOutput": "output" },
    { "input": "another test",   "expectedOutput": "output" },
    { "input": "edge case",      "expectedOutput": "output" },
    { "input": "large input",    "expectedOutput": "output" },
    { "input": "boundary case",  "expectedOutput": "output" }
  ],
  "timeLimitMinutes": 45
}

RULES:
- Exactly 5 test cases, at least 1 edge case
- Problem must be solvable in ${language}
- Do NOT include the solution
- Return ONLY the JSON object`;

    // STEP 3: Call DeepSeek via Ollama
    const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:  process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b',
        prompt,
        stream: false,
        options: {
          temperature: 0.7,   // Creative enough for varied questions
          top_p:       0.9,
          num_predict: 1500,
        },
      }),
    });

    const data = await response.json();

    // STEP 4: Parse JSON response (strip code fences if model adds them)
    let qData: any;
    try {
      const clean = data.response
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      qData = JSON.parse(clean);
    } catch (e) {
      this.logger.error('Failed to parse AI response:', data.response);
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // STEP 5: Persist to PostgreSQL
    const question = this.questionsRepo.create({
      language,
      difficulty,
      problemStatement: qData.problemStatement,
      constraints:      qData.constraints,
      sampleInput:      qData.sampleInput,
      sampleOutput:     qData.sampleOutput,
      testCases:        qData.testCases,
      timeLimitMinutes: qData.timeLimitMinutes || 45,
    });

    const saved = await this.questionsRepo.save(question);

    // STEP 6: Add back into ChromaDB — question bank grows automatically
    await this.ragService.addQuestion(
      saved.id,
      saved.problemStatement,
      language,
      difficulty,
    );

    this.logger.log(`Generated question ${saved.id} [${language}/${difficulty}]`);
    return saved;
  }
}
```

### questions.controller.ts

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuestionsService } from './questions.service';
import { IsString, IsIn } from 'class-validator';

export class GenerateQuestionDto {
  @IsString()
  @IsIn(['python','java','cpp','c','javascript','html','css','r'])
  language: string;

  @IsString()
  @IsIn(['easy','medium','hard'])
  difficulty: string;
}

@Controller('api/questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateQuestionDto) {
    const question = await this.questionsService.generateQuestion(
      dto.language,
      dto.difficulty,
    );

    // Return public fields ONLY — never expose testCases to the student
    const { testCases, ...publicQuestion } = question;
    return publicQuestion;
  }
}
```

---

## 9. Submission and Execution Flow

### submission.entity.ts (complete)

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn,
  ManyToOne, CreateDateColumn, JoinColumn
} from 'typeorm';
import { User }     from '../users/user.entity';
import { Question } from '../questions/question.entity';

export enum SubmissionStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  COMPLETED = 'completed',
  ERROR     = 'error',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  questionId: string;

  @Column('text')
  code: string;                // Encrypted with AES-256 at rest

  @Column()
  language: string;

  @Column()
  difficulty: string;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING })
  status: SubmissionStatus;

  @Column({ type: 'int', default: 0 })
  score: number;               // 0–100

  @Column({ default: false })
  passed: boolean;

  @Column({ type: 'int', default: 0 })
  testsPassed: number;

  @Column({ type: 'int', default: 0 })
  testsTotal: number;

  // Full grading result stored as JSON for the result/download page
  @Column({ type: 'jsonb', nullable: true })
  gradeResult: any;

  @CreateDateColumn()
  createdAt: Date;
}
```

### submissions.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Submission, SubmissionStatus } from './submission.entity';
import { Question } from '../questions/question.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(Question)   private questionsRepo:   Repository<Question>,
    @InjectQueue('execution')     private executionQueue:  Queue,
    private usersService: UsersService,
  ) {}

  async submitCode(
    userId:     string,
    questionId: string,
    code:       string,
    language:   string,
  ): Promise<Submission> {
    const question = await this.questionsRepo.findOne({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    // Create the submission record
    const submission = this.submissionsRepo.create({
      userId,
      questionId,
      code,
      language,
      difficulty: question.difficulty,
      status:     SubmissionStatus.PENDING,
    });

    const saved = await this.submissionsRepo.save(submission);

    // Push to BullMQ execution queue
    // Workers pick this up and run the code against all test cases
    await this.executionQueue.add('run-code', {
      submissionId: saved.id,
      code,
      language,
      testCases:    question.testCases,
      questionId,
      userId,
      difficulty:   question.difficulty,
      problemStatement: question.problemStatement,
    });

    return saved;
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    return this.submissionsRepo.findOne({
      where: { id },
      relations: ['question'],
    });
  }

  async getStudentHistory(userId: string): Promise<Submission[]> {
    return this.submissionsRepo.find({
      where: { userId },
      relations: ['question'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateSubmissionResult(
    submissionId: string,
    result: any,
  ): Promise<void> {
    await this.submissionsRepo.update(submissionId, {
      status:      SubmissionStatus.COMPLETED,
      score:       result.score,
      passed:      result.passed,
      testsPassed: result.testsPassed,
      testsTotal:  result.testsTotal,
      gradeResult: result,
    });

    // Update the student's profile stats
    const submission = await this.submissionsRepo.findOne({
      where: { id: submissionId }
    });
    if (submission) {
      await this.usersService.updateProgressStats(
        submission.userId,
        result.passed,
        result.score,
      );
    }
  }
}
```

---

## 10. Grading Module — Auto-grade with AI

Two stages: deterministic (test case comparison) + AI (code quality review).

### grading.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface GradeResult {
  testsPassed:  number;
  testsTotal:   number;
  score:        number;       // 0–100
  passed:       boolean;
  testDetails:  TestDetail[];
  aiFeedback:   AiFeedback;
  gradedAt:     string;
}

export interface TestDetail {
  index:          number;
  input:          string;
  expectedOutput: string;
  actualOutput:   string;
  passed:         boolean;
}

export interface AiFeedback {
  codeQuality:    string;
  timeComplexity: string;
  qualityScore:   number;   // 0–40 (added on top of test case score)
  suggestions:    string[];
  overallComment: string;
}

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  async grade(
    code:             string,
    language:         string,
    difficulty:       string,
    problemStatement: string,
    testCases:        { input: string; expectedOutput: string }[],
    executionResults: { input: string; output: string; exitCode: number }[],
  ): Promise<GradeResult> {

    // === STAGE 1: Deterministic test case comparison ===
    const testDetails: TestDetail[] = testCases.map((tc, i) => {
      const exec           = executionResults[i];
      const actualOutput   = exec?.output?.trim() || '';
      const expectedOutput = tc.expectedOutput.trim();

      return {
        index:          i + 1,
        input:          tc.input,
        expectedOutput,
        actualOutput,
        // Pass only if output matches exactly AND no runtime error
        passed: actualOutput === expectedOutput && exec?.exitCode === 0,
      };
    });

    const testsPassed = testDetails.filter(t => t.passed).length;
    const testsTotal  = testDetails.length;

    // Test cases worth 60 points (10 points each for 5 test cases + partial marks)
    const testScore = Math.round((testsPassed / testsTotal) * 60);

    // === STAGE 2: AI code quality analysis ===
    const aiFeedback = await this.analyzeCode(code, language, difficulty, problemStatement);

    // Final score = test case score (0–60) + AI quality score (0–40)
    const finalScore = Math.min(100, testScore + (aiFeedback.qualityScore || 20));

    return {
      testsPassed,
      testsTotal,
      score:      finalScore,
      passed:     testsPassed === testsTotal,
      testDetails,
      aiFeedback,
      gradedAt:   new Date().toISOString(),
    };
  }

  private async analyzeCode(
    code:             string,
    language:         string,
    difficulty:       string,
    problemStatement: string,
  ): Promise<AiFeedback> {

    const prompt = `You are a college professor grading a ${difficulty.toUpperCase()} ${language.toUpperCase()} programming assignment.

PROBLEM:
${problemStatement}

STUDENT CODE:
\`\`\`${language}
${code}
\`\`\`

Analyze the code. Return ONLY valid JSON, no preamble, no explanation:

{
  "codeQuality": "one sentence describing overall code quality (clean/readable/messy/etc)",
  "timeComplexity": "e.g. O(n), O(n^2), O(n log n) — state if unknown",
  "qualityScore": <integer between 0 and 40>,
  "suggestions": [
    "specific, actionable improvement 1",
    "specific, actionable improvement 2"
  ],
  "overallComment": "2-3 sentences of encouraging, constructive feedback for the student"
}

QUALITY SCORE GUIDE (0–40 points):
35–40: Clean, efficient, well-named variables, handles edge cases properly
25–34: Correct approach, minor style or efficiency issues
15–24: Works but inefficient (e.g. O(n^2) when O(n) possible) or hard to read
5–14:  Partially correct or significant readability issues
0–4:   Non-functional, completely wrong approach, or plagiarised

Return ONLY the JSON object.`;

    try {
      const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:  process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b',
          prompt,
          stream: false,
          options: {
            temperature: 0.2,    // Low temperature = consistent, fair grading
            num_predict: 500,
          },
        }),
      });

      const data  = await response.json();
      const clean = data.response
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(clean);
    } catch (err) {
      this.logger.warn('AI grading failed, using fallback', err);
      // If AI fails, grading still works from test cases — platform stays up
      return {
        codeQuality:    'Unable to analyze at this time',
        timeComplexity: 'Unknown',
        qualityScore:   20,   // Default mid-range quality score
        suggestions:    ['Try to add comments explaining your approach'],
        overallComment: 'Your submission has been graded based on test case results.',
      };
    }
  }
}
```

---

## 11. Results Download — PDF Generation

### Install pdfkit

```bash
npm install pdfkit
npm install -D @types/pdfkit
```

### results.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Submission } from '../submissions/submission.entity';

@Injectable()
export class ResultsService {

  generatePDF(submission: Submission, studentName: string, regNumber: string): Buffer {
    const doc    = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const result = submission.gradeResult;

    // ── HEADER ──
    doc
      .fontSize(20).font('Helvetica-Bold')
      .text('COLLEGE CODING ASSESSMENT', { align: 'center' })
      .fontSize(14).font('Helvetica')
      .text('Result Report', { align: 'center' })
      .moveDown(0.5);

    // Horizontal rule
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    // ── STUDENT DETAILS ──
    doc.fontSize(11).font('Helvetica-Bold').text('STUDENT DETAILS', { underline: true });
    doc.moveDown(0.3);

    const details = [
      ['Name',        studentName],
      ['Reg Number',  regNumber],
      ['Language',    submission.language.toUpperCase()],
      ['Difficulty',  submission.difficulty.toUpperCase()],
      ['Submitted At', new Date(submission.createdAt).toLocaleString('en-IN')],
    ];

    doc.font('Helvetica').fontSize(10);
    details.forEach(([label, value]) => {
      doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    doc.moveDown(0.8);

    // ── SCORE SECTION ──
    doc.fontSize(11).font('Helvetica-Bold').text('RESULT SUMMARY', { underline: true });
    doc.moveDown(0.3);

    const scoreColor = result.passed ? '#16a34a' : '#dc2626';
    doc
      .fontSize(28).fillColor(scoreColor).font('Helvetica-Bold')
      .text(`${result.score}/100`, { align: 'center' });

    doc
      .fontSize(14).fillColor(result.passed ? '#16a34a' : '#dc2626')
      .text(result.passed ? '✓ PASSED' : '✗ NOT PASSED', { align: 'center' });

    doc.fillColor('#000000').fontSize(11).font('Helvetica')
      .text(`Test Cases: ${result.testsPassed} / ${result.testsTotal} passed`, { align: 'center' });

    doc.moveDown(0.8);

    // ── TEST CASE DETAILS ──
    doc.fontSize(11).font('Helvetica-Bold').text('TEST CASE RESULTS', { underline: true });
    doc.moveDown(0.3);

    if (result.testDetails) {
      result.testDetails.forEach((tc: any) => {
        const icon = tc.passed ? '✓' : '✗';
        const color = tc.passed ? '#16a34a' : '#dc2626';

        doc.fillColor(color).font('Helvetica-Bold').fontSize(10)
          .text(`${icon} Test Case ${tc.index}: ${tc.passed ? 'PASSED' : 'FAILED'}`);

        if (!tc.passed) {
          doc.fillColor('#6b7280').font('Helvetica').fontSize(9)
            .text(`  Expected: ${tc.expectedOutput}`)
            .text(`  Got:      ${tc.actualOutput}`);
        }

        doc.fillColor('#000000').moveDown(0.2);
      });
    }

    doc.moveDown(0.5);

    // ── AI FEEDBACK ──
    doc.fontSize(11).font('Helvetica-Bold').text('AI CODE REVIEW', { underline: true });
    doc.moveDown(0.3);

    if (result.aiFeedback) {
      doc.font('Helvetica').fontSize(10);
      doc.text(`Code Quality:    ${result.aiFeedback.codeQuality}`);
      doc.text(`Time Complexity: ${result.aiFeedback.timeComplexity}`);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Overall Feedback:');
      doc.font('Helvetica').text(result.aiFeedback.overallComment, { width: 445 });
      doc.moveDown(0.3);

      if (result.aiFeedback.suggestions?.length > 0) {
        doc.font('Helvetica-Bold').text('Suggestions for Improvement:');
        doc.font('Helvetica');
        result.aiFeedback.suggestions.forEach((s: string) => {
          doc.text(`• ${s}`, { width: 445 });
        });
      }
    }

    doc.moveDown(0.8);

    // ── FOOTER ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text(
        `Generated by College Coding Assessment Platform  •  ${new Date().toLocaleString('en-IN')}`,
        { align: 'center' }
      );

    doc.end();

    // Combine all buffer chunks and return
    return Buffer.concat(chunks);
  }
}
```

### results.controller.ts

```typescript
import { Controller, Get, Param, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard';
import { ResultsService }   from './results.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { UsersService }     from '../users/users.service';

@Controller('api/results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(
    private resultsService:     ResultsService,
    private submissionsService: SubmissionsService,
    private usersService:       UsersService,
  ) {}

  // GET /api/results/:submissionId/download
  // Returns a PDF file of the result report
  @Get(':submissionId/download')
  async downloadResult(
    @Param('submissionId') submissionId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const submission = await this.submissionsService.getSubmissionById(submissionId);

    // Students can only download their own results
    if (!submission || submission.userId !== req.user.userId) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const user = await this.usersService.findById(req.user.userId);

    const pdfBuffer = this.resultsService.generatePDF(
      submission,
      user?.name      || 'Student',
      user?.regNumber || req.user.regNumber,
    );

    // Set headers so browser downloads the file instead of displaying it
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="result-${submission.language}-${submission.difficulty}-${submissionId.slice(0, 8)}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
```

---

## 12. Student Profile and Progress Tracking

### progress.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submissions/submission.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(User)       private usersRepo:       Repository<User>,
  ) {}

  async getStudentProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Scores by difficulty
    const byDifficulty = await this.submissionsRepo
      .createQueryBuilder('s')
      .select('s.difficulty',               'difficulty')
      .addSelect('COUNT(*)',                 'total')
      .addSelect('AVG(s.score)',             'avgScore')
      .addSelect('SUM(CASE WHEN s.passed = true THEN 1 ELSE 0 END)', 'passed')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('s.difficulty')
      .getRawMany();

    // Scores by language
    const byLanguage = await this.submissionsRepo
      .createQueryBuilder('s')
      .select('s.language',                 'language')
      .addSelect('COUNT(*)',                 'total')
      .addSelect('AVG(s.score)',             'avgScore')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('s.language')
      .getRawMany();

    // Last 10 submissions for history timeline
    const recentSubmissions = await this.submissionsRepo.find({
      where:     { userId, status: 'completed' as any },
      relations: ['question'],
      order:     { createdAt: 'DESC' },
      take:      10,
    });

    // Score trend (last 10 scores for chart)
    const scoreTrend = recentSubmissions.map(s => ({
      date:       s.createdAt,
      score:      s.score,
      language:   s.language,
      difficulty: s.difficulty,
      passed:     s.passed,
    })).reverse();  // Oldest first for chart

    return {
      student: {
        name:             user.name,
        regNumber:        user.regNumber,
        department:       user.department,
        year:             user.year,
        totalAssessments: user.totalAssessments,
        totalPassed:      user.totalPassed,
        averageScore:     user.averageScore,
        passRate:         user.totalAssessments > 0
          ? Math.round((user.totalPassed / user.totalAssessments) * 100)
          : 0,
        currentStreak:    user.currentStreak,
        longestStreak:    user.longestStreak,
      },
      byDifficulty,
      byLanguage,
      scoreTrend,
      recentSubmissions: recentSubmissions.map(s => ({
        id:           s.id,
        language:     s.language,
        difficulty:   s.difficulty,
        score:        s.score,
        passed:       s.passed,
        submittedAt:  s.createdAt,
      })),
    };
  }
}
```

### progress.controller.ts

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard }   from '../common/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';

@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  // GET /api/profile
  // Returns full student profile + progress data
  @Get()
  async getProfile(@Request() req) {
    return this.progressService.getStudentProfile(req.user.userId);
  }
}
```

---

## 13. Frontend — LeetCode-style UI

### Login.tsx — reg number login

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

export default function Login() {
  const [regNumber, setRegNumber] = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', {
        regNumber: regNumber.toUpperCase(),
        password,
      });

      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user',  JSON.stringify(res.data.user));

      // If first login — redirect to change password page
      if (res.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid registration number or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#0f172a',
    }}>
      <div style={{
        background:   '#1e293b',
        borderRadius: 12,
        padding:      '2.5rem',
        width:        360,
        boxShadow:    '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <h1 style={{ color: '#f8fafc', textAlign: 'center', marginBottom: 8 }}>
          🎓 CollegeCode
        </h1>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '2rem', fontSize: 14 }}>
          Coding Assessment Platform
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#cbd5e1', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Registration Number
            </label>
            <input
              value={regNumber}
              onChange={e => setRegNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 21CS001"
              style={{
                width: '100%', padding: '0.75rem', background: '#0f172a',
                border: '1px solid #334155', borderRadius: 8, color: '#f8fafc',
                fontSize: 15, fontFamily: 'monospace', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: '#cbd5e1', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%', padding: '0.75rem', background: '#0f172a',
                border: '1px solid #334155', borderRadius: 8, color: '#f8fafc',
                fontSize: 15, boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: 13, marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.875rem',
              background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### ChangePassword.tsx — first login + anytime

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await axios.post('/api/auth/change-password', { oldPassword, newPassword });
      setSuccess(true);

      // Update local user object to clear mustChangePassword flag
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.mustChangePassword = false;
      localStorage.setItem('user', JSON.stringify(user));

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 12, padding: '2.5rem', width: 380,
      }}>
        <h2 style={{ color: '#f8fafc', marginBottom: 8 }}>Set New Password</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: '1.5rem' }}>
          You need to set a personal password before continuing.
        </p>

        {success ? (
          <p style={{ color: '#34d399', textAlign: 'center', fontWeight: 600 }}>
            ✓ Password changed! Redirecting to dashboard...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            {[
              ['Current Password', oldPassword, setOldPassword],
              ['New Password',     newPassword, setNewPassword],
              ['Confirm New Password', confirm, setConfirm],
            ].map(([label, value, setter]: any) => (
              <div key={label} style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', background: '#0f172a',
                    border: '1px solid #334155', borderRadius: 8,
                    color: '#f8fafc', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{error}</p>
            )}

            <button type="submit" style={{
              width: '100%', padding: '0.875rem',
              background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}>
              Set Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

### Dashboard.tsx — language + difficulty selection

```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../services/api';

const LANGUAGES = [
  { id: 'python',     label: 'Python',     icon: '🐍', color: '#3b82f6' },
  { id: 'java',       label: 'Java',       icon: '☕', color: '#f59e0b' },
  { id: 'cpp',        label: 'C++',        icon: '⚙️', color: '#8b5cf6' },
  { id: 'c',          label: 'C',          icon: '🔧', color: '#6b7280' },
  { id: 'javascript', label: 'JavaScript', icon: '🟨', color: '#eab308' },
  { id: 'html',       label: 'HTML',       icon: '🌐', color: '#f97316' },
  { id: 'css',        label: 'CSS',        icon: '🎨', color: '#06b6d4' },
  { id: 'r',          label: 'R',          icon: '📊', color: '#22c55e' },
];

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   color: '#22c55e', desc: 'Basic concepts • O(n) • ~15 min' },
  { id: 'medium', label: 'Medium', color: '#f59e0b', desc: 'Combined concepts • ~30 min' },
  { id: 'hard',   label: 'Hard',   color: '#ef4444', desc: 'Algorithms & DP • ~45 min' },
];

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [lang,    setLang]    = useState('');
  const [diff,    setDiff]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!lang || !diff) return;
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/questions/generate', {
        language:   lang,
        difficulty: diff,
      });
      navigate('/assessment', {
        state: { question: res.data, language: lang, difficulty: diff },
      });
    } catch {
      setError('Failed to generate question. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Welcome, {user.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0' }}>{user.regNumber}</p>
        </div>
        <Link to="/profile" style={{
          background: '#f3f4f6', border: 'none', borderRadius: 8,
          padding: '8px 16px', cursor: 'pointer', textDecoration: 'none', color: '#374151',
        }}>
          📊 My Progress
        </Link>
      </div>

      {/* Language selection */}
      <h2>1. Select Language</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '2rem' }}>
        {LANGUAGES.map(l => (
          <button key={l.id} onClick={() => setLang(l.id)} style={{
            padding: '1rem', border: lang === l.id ? `2px solid ${l.color}` : '1px solid #e5e7eb',
            borderRadius: 10, background: lang === l.id ? `${l.color}18` : '#fff',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 28 }}>{l.icon}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{l.label}</div>
          </button>
        ))}
      </div>

      {/* Difficulty selection */}
      <h2>2. Select Difficulty</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '2rem' }}>
        {DIFFICULTIES.map(d => (
          <button key={d.id} onClick={() => setDiff(d.id)} style={{
            padding: '1.25rem', border: diff === d.id ? `2px solid ${d.color}` : '1px solid #e5e7eb',
            borderRadius: 10, background: diff === d.id ? `${d.color}18` : '#fff',
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontWeight: 700, color: d.color, fontSize: 18 }}>{d.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{d.desc}</div>
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

      <button
        onClick={handleStart}
        disabled={!lang || !diff || loading}
        style={{
          width: '100%', padding: '1rem',
          background: (!lang || !diff) ? '#e5e7eb' : '#6366f1',
          color: (!lang || !diff) ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {loading
          ? '⏳ AI is generating your question...'
          : (!lang || !diff)
            ? 'Select language and difficulty to begin'
            : `Start ${diff?.toUpperCase()} ${lang?.toUpperCase()} Assessment →`
        }
      </button>
    </div>
  );
}
```

### Results.tsx — with PDF download button

```tsx
import { useLocation, Link } from 'react-router-dom';
import axios from '../services/api';

export default function Results() {
  const { state } = useLocation();
  const { result, submissionId, language, difficulty } = state;

  const downloadPDF = async () => {
    const response = await fetch(
      `/api/results/${submissionId}/download`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `result-${language}-${difficulty}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const diffColor: Record<string, string> = {
    easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444'
  };

  return (
    <div style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Assessment Result</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={downloadPDF} style={{
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer',
          }}>
            ⬇ Download PDF
          </button>
          <Link to="/dashboard" style={{
            background: '#f3f4f6', color: '#374151', border: 'none',
            borderRadius: 8, padding: '8px 20px', fontWeight: 600,
            cursor: 'pointer', textDecoration: 'none',
          }}>
            Try Another →
          </Link>
        </div>
      </div>

      {/* Score banner */}
      <div style={{
        background: result.passed ? '#dcfce7' : '#fee2e2',
        border: `2px solid ${result.passed ? '#22c55e' : '#ef4444'}`,
        borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: 24,
      }}>
        <div style={{
          fontSize: 72, fontWeight: 900,
          color: result.passed ? '#16a34a' : '#dc2626'
        }}>
          {result.score}
        </div>
        <div style={{ fontSize: 16, color: '#6b7280' }}>out of 100</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8,
          color: result.passed ? '#16a34a' : '#dc2626' }}>
          {result.passed ? '✅ PASSED' : '❌ NOT PASSED'}
        </div>
        <div style={{ marginTop: 8, color: '#6b7280' }}>
          {result.testsPassed} / {result.testsTotal} test cases passed
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{
            background: diffColor[difficulty] + '20',
            color: diffColor[difficulty],
            padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 600,
          }}>
            {difficulty?.toUpperCase()}
          </span>
          <span style={{ margin: '0 8px', color: '#d1d5db' }}>•</span>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{language?.toUpperCase()}</span>
        </div>
      </div>

      {/* Test cases */}
      <h3>Test Case Breakdown</h3>
      {result.testDetails?.map((tc: any) => (
        <div key={tc.index} style={{
          borderLeft: `4px solid ${tc.passed ? '#22c55e' : '#ef4444'}`,
          background: tc.passed ? '#f0fdf4' : '#fff7f7',
          borderRadius: '0 8px 8px 0',
          padding: '0.75rem 1rem', marginBottom: 8,
        }}>
          <div style={{ fontWeight: 600, color: tc.passed ? '#16a34a' : '#dc2626' }}>
            {tc.passed ? '✓' : '✗'} Test Case {tc.index}
          </div>
          {!tc.passed && (
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              <div>Expected: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{tc.expectedOutput}</code></div>
              <div>Got: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{tc.actualOutput}</code></div>
            </div>
          )}
        </div>
      ))}

      {/* AI Feedback */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: '1.5rem', marginTop: 24,
      }}>
        <h3 style={{ marginTop: 0 }}>🤖 AI Code Review</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>CODE QUALITY</div>
            <div style={{ marginTop: 4, fontWeight: 500 }}>{result.aiFeedback?.codeQuality}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>TIME COMPLEXITY</div>
            <div style={{ marginTop: 4, fontFamily: 'monospace', fontWeight: 700 }}>{result.aiFeedback?.timeComplexity}</div>
          </div>
        </div>
        <div style={{ background: '#eef2ff', borderRadius: 8, padding: '1rem', marginBottom: 12 }}>
          <strong>Overall Feedback:</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.7, color: '#374151' }}>
            {result.aiFeedback?.overallComment}
          </p>
        </div>
        {result.aiFeedback?.suggestions?.length > 0 && (
          <div>
            <strong>Suggestions:</strong>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              {result.aiFeedback.suggestions.map((s: string, i: number) => (
                <li key={i} style={{ color: '#374151', marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Profile.tsx — progress dashboard

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../services/api';

export default function Profile() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/profile').then(r => setData(r.data));
  }, []);

  if (!data) return <div style={{ padding: '2rem' }}>Loading profile...</div>;

  const { student, byDifficulty, byLanguage, recentSubmissions, scoreTrend } = data;

  const diffColor: Record<string, string> = {
    easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444'
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>My Progress</h2>
        <Link to="/dashboard" style={{
          background: '#6366f1', color: '#fff', borderRadius: 8,
          padding: '8px 20px', textDecoration: 'none', fontWeight: 600,
        }}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* Student info card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        borderRadius: 16, padding: '1.5rem', color: '#fff', marginBottom: 24,
      }}>
        <h2 style={{ margin: '0 0 4px' }}>{student.name}</h2>
        <p style={{ margin: 0, opacity: 0.85 }}>
          {student.regNumber} · {student.department} · Year {student.year}
        </p>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Taken',   value: student.totalAssessments, color: '#6366f1' },
          { label: 'Total Passed',  value: student.totalPassed,      color: '#22c55e' },
          { label: 'Average Score', value: `${student.averageScore}%`, color: '#f59e0b' },
          { label: 'Pass Rate',     value: `${student.passRate}%`,   color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 12, padding: '1.25rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 12, padding: '1rem 1.5rem', marginBottom: 24,
        display: 'flex', gap: 32,
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
            🔥 {student.currentStreak}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Current Streak (days)</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
            ⭐ {student.longestStreak}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Longest Streak (days)</div>
        </div>
      </div>

      {/* By difficulty */}
      <h3>Performance by Difficulty</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {['easy', 'medium', 'hard'].map(d => {
          const stat = byDifficulty.find((b: any) => b.difficulty === d) || {};
          return (
            <div key={d} style={{
              border: `2px solid ${diffColor[d]}30`,
              background: `${diffColor[d]}08`,
              borderRadius: 12, padding: '1rem',
            }}>
              <div style={{ fontWeight: 700, color: diffColor[d], marginBottom: 8 }}>
                {d.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                <div>Attempted: {stat.total || 0}</div>
                <div>Passed: {stat.passed || 0}</div>
                <div>Avg Score: {stat.avgScore ? Math.round(stat.avgScore) : '—'}%</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent history */}
      <h3>Recent Submissions</h3>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {recentSubmissions.length === 0 ? (
          <p style={{ padding: '1.5rem', color: '#6b7280', textAlign: 'center' }}>
            No submissions yet. Take your first assessment!
          </p>
        ) : (
          recentSubmissions.map((s: any, i: number) => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.875rem 1.25rem',
              borderBottom: i < recentSubmissions.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  background: diffColor[s.difficulty] + '20',
                  color: diffColor[s.difficulty],
                  padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                }}>
                  {s.difficulty}
                </span>
                <span style={{ fontWeight: 500 }}>{s.language.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  fontWeight: 700, fontSize: 18,
                  color: s.passed ? '#16a34a' : '#dc2626',
                }}>
                  {s.score}/100
                </span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date(s.submittedAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 14. Updated Docker Sandbox — All Languages

### sandbox/c/Dockerfile

```dockerfile
FROM gcc:12-alpine
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /sandbox
```

### sandbox/r/Dockerfile

```dockerfile
FROM r-base:4.3.0
RUN adduser --disabled-password --gecos '' sandbox
USER sandbox
WORKDIR /sandbox
```

### sandbox/html/Dockerfile

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /sandbox
```

### sandbox/runner.sh (all 8 languages)

```bash
#!/bin/bash
LANGUAGE=$1
CODE_FILE=$2
INPUT_FILE=${3:-/dev/null}
TIMEOUT=5

case $LANGUAGE in
  python)
    timeout $TIMEOUT python3 "$CODE_FILE" < "$INPUT_FILE"
    ;;
  javascript)
    timeout $TIMEOUT node "$CODE_FILE" < "$INPUT_FILE"
    ;;
  java)
    javac "$CODE_FILE" 2>&1 || exit 1
    CLASS=$(basename "$CODE_FILE" .java)
    timeout $TIMEOUT java "$CLASS" < "$INPUT_FILE"
    ;;
  cpp)
    g++ -O2 -o /tmp/sol "$CODE_FILE" 2>&1 || exit 1
    timeout $TIMEOUT /tmp/sol < "$INPUT_FILE"
    ;;
  c)
    gcc -O2 -o /tmp/sol "$CODE_FILE" 2>&1 || exit 1
    timeout $TIMEOUT /tmp/sol < "$INPUT_FILE"
    ;;
  r)
    timeout $TIMEOUT Rscript "$CODE_FILE" < "$INPUT_FILE"
    ;;
  html|css)
    # HTML/CSS has no stdout output — graded structurally by AI
    cat "$CODE_FILE"
    exit 0
    ;;
  *)
    echo "Unsupported language: $LANGUAGE"
    exit 1
    ;;
esac
exit $?
```

---

## 15. Ollama Setup

### On Your Windows 11 Laptop (Development)

```bash
# 1. Download Ollama from https://ollama.com — Windows installer (~500MB)
# 2. After install, open PowerShell:

# Pull DeepSeek Coder (question generation + grading AI)
ollama pull deepseek-coder:6.7b

# Pull nomic-embed-text (RAG embeddings — small and fast)
ollama pull nomic-embed-text

# Test DeepSeek works
ollama run deepseek-coder:6.7b "Write hello world in Python"

# Ollama listens on http://localhost:11434
# Set in .env: OLLAMA_URL=http://localhost:11434
```

### On Linux College Server

```bash
curl -fsSL https://ollama.com/install.sh | sh

ollama pull deepseek-coder:6.7b
ollama pull nomic-embed-text

# Enable as system service so it restarts on reboot
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Disk + RAM Usage Summary

```
Your Windows 11 Laptop (16 GB RAM, 512 GB SSD):

Ollama binary:            ~300 MB
deepseek-coder:6.7b:      ~3.8 GB on disk,  ~6.5 GB RAM when loaded
nomic-embed-text:         ~270 MB on disk,  ~500 MB RAM when loaded
─────────────────────────────────────────────
Total AI disk usage:      ~4.4 GB           (0.85% of your 512 GB)

RAM budget:
  AI models:              ~7 GB
  NestJS (×3 instances):  ~600 MB
  PostgreSQL:             ~300 MB
  Redis:                  ~100 MB
  ChromaDB:               ~200 MB
  OS + browser:           ~2 GB
─────────────────────────────────────────────
Total RAM used:           ~10.2 GB          (fits in 16 GB with ~5.8 GB free)
```

---

## 16. Updated Docker Compose

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/letsencrypt:ro
      - ./frontend/dist:/var/www/dist:ro
    depends_on: [api1, api2, api3]
    restart: unless-stopped

  api1: &api
    build: ./backend
    environment: { PORT: 3000 }
    env_file: ./backend/.env
    depends_on: [postgres, redis, chroma]
    restart: unless-stopped

  api2:
    <<: *api

  api3:
    <<: *api

  worker1:
    build: ./backend
    command: node dist/execution/worker.js
    env_file: ./backend/.env
    depends_on: [redis, postgres]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

  worker2:
    build: ./backend
    command: node dist/execution/worker.js
    env_file: ./backend/.env
    depends_on: [redis, postgres]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: platform_user
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: coding_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # ChromaDB — vector database for RAG question retrieval
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      IS_PERSISTENT: "TRUE"
      ANONYMIZED_TELEMETRY: "FALSE"
    restart: unless-stopped

  # Ollama — local AI model server
  # On laptop: run Ollama natively for better performance
  # In Docker Compose: used on server deployment
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama     # Models persist here after first pull
    restart: unless-stopped
    # Uncomment below if server has NVIDIA GPU:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

volumes:
  postgres_data:
  redis_data:
  chroma_data:
  ollama_models:
```

---

## 17. Seed Script — Bootstrap ChromaDB

Run once after first deployment to fill the vector store with initial questions. After seeding, every question generated in production automatically gets added back, so the question bank grows permanently over time.

```typescript
// scripts/seed-vector-store.ts
// Run: npx ts-node scripts/seed-vector-store.ts

const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434';
const CHROMA_URL  = process.env.CHROMA_URL  || 'http://localhost:8000';
const MODEL       = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b';

const LANGUAGES   = ['python', 'java', 'cpp', 'c', 'javascript', 'html', 'css', 'r'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PER_COMBO   = 3;   // 3 questions × 8 languages × 3 difficulties = 72 seed questions

async function generateOne(language: string, difficulty: string, index: number) {
  const prompt = `Generate a ${difficulty} ${language} coding question.
Return ONLY JSON: { "problemStatement": "...", "sampleInput": "...", "sampleOutput": "..." }
Make question #${index} unique.`;

  const res  = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.8 } }),
  });

  const data  = await res.json();
  const clean = data.response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

async function seed() {
  const { ChromaClient } = await import('chromadb');
  const client = new ChromaClient({ path: CHROMA_URL });

  // Clean slate
  try { await client.deleteCollection({ name: 'coding_questions' }); } catch {}
  const collection = await client.createCollection({ name: 'coding_questions' });

  let total = 0;

  for (const language of LANGUAGES) {
    for (const difficulty of DIFFICULTIES) {
      console.log(`Seeding ${language}/${difficulty}...`);

      for (let i = 0; i < PER_COMBO; i++) {
        try {
          const q  = await generateOne(language, difficulty, i + 1);
          const id = `seed-${language}-${difficulty}-${i}`;

          await collection.add({
            ids:       [id],
            documents: [q.problemStatement],
            metadatas: [{ language, difficulty }],
          });

          console.log(`  ✓ ${id}`);
          total++;
        } catch (e) {
          console.error(`  ✗ ${language}/${difficulty}/${i}: ${e}`);
        }
      }
    }
  }

  console.log(`\nSeed complete. Total: ${total} questions in ChromaDB.`);
}

seed().catch(console.error);
```

### Run the seed (one time only after deploy)

```bash
# Start ChromaDB and Ollama first
docker compose up -d chroma ollama

# Pull models (if not already done)
docker compose exec ollama ollama pull deepseek-coder:6.7b
docker compose exec ollama ollama pull nomic-embed-text

# Wait ~30 seconds for models to load, then run seed
npx ts-node scripts/seed-vector-store.ts

# Verify
curl http://localhost:8000/api/v1/collections
```

---

## 18. Environment Variables

### backend/.env.example (complete)

```bash
# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=platform_user
DB_PASS=your-strong-db-password
DB_NAME=coding_platform

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security — generate with: openssl rand -hex 64
JWT_SECRET=your-256-bit-secret-here
DB_ENCRYPTION_KEY=your-32-char-aes-256-key-here

# Ollama (local AI — no API key needed)
# Laptop dev:   http://localhost:11434
# Docker stack: http://ollama:11434
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=deepseek-coder:6.7b

# ChromaDB (vector store for RAG)
# Laptop dev:   http://localhost:8000
# Docker stack: http://chroma:8000
CHROMA_URL=http://chroma:8000

# Default password given to all imported students
# (Students must change this on first login)
DEFAULT_STUDENT_PASSWORD=College@2024
```

---

## 19. Faculty Dashboard

### faculty.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submissions/submission.entity';
import { User }       from '../users/user.entity';

@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(User)       private usersRepo:       Repository<User>,
  ) {}

  // Full results table — filter by department, difficulty, language, year
  async getAllResults(filters: {
    department?: string;
    difficulty?: string;
    language?:   string;
    year?:       number;
  }) {
    const q = this.submissionsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.question', 'q')
      .where('s.status = :status', { status: 'completed' })
      .orderBy('s.createdAt', 'DESC');

    if (filters.department) q.andWhere('u.department = :dept', { dept: filters.department });
    if (filters.difficulty) q.andWhere('s.difficulty = :diff', { diff: filters.difficulty });
    if (filters.language)   q.andWhere('s.language = :lang',   { lang: filters.language });
    if (filters.year)       q.andWhere('u.year = :year',       { year: filters.year });

    const rows = await q.getMany();

    return rows.map(s => ({
      regNumber:   s.user?.regNumber,
      name:        s.user?.name,
      department:  s.user?.department,
      year:        s.user?.year,
      language:    s.language,
      difficulty:  s.difficulty,
      score:       s.score,
      passed:      s.passed,
      testsPassed: s.testsPassed,
      testsTotal:  s.testsTotal,
      submittedAt: s.createdAt,
    }));
  }

  // Summary stats by difficulty for the dashboard charts
  async getSummaryStats() {
    const byDiff = await this.submissionsRepo
      .createQueryBuilder('s')
      .select('s.difficulty',  'difficulty')
      .addSelect('COUNT(*)',   'total')
      .addSelect('AVG(s.score)', 'avgScore')
      .addSelect('SUM(CASE WHEN s.passed = true THEN 1 ELSE 0 END)', 'passed')
      .where('s.status = :status', { status: 'completed' })
      .groupBy('s.difficulty')
      .getRawMany();

    const topStudents = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.totalAssessments > 0')
      .orderBy('u.averageScore', 'DESC')
      .take(10)
      .select(['u.regNumber', 'u.name', 'u.department', 'u.averageScore', 'u.totalPassed'])
      .getMany();

    return { byDiff, topStudents };
  }

  // Export all results as CSV text
  async exportCSV(filters: any): Promise<string> {
    const results = await this.getAllResults(filters);

    const header = 'RegNumber,Name,Department,Year,Language,Difficulty,Score,Passed,SubmittedAt';
    const rows   = results.map(r =>
      `${r.regNumber},${r.name},${r.department},${r.year},${r.language},${r.difficulty},${r.score},${r.passed},${r.submittedAt}`
    );

    return [header, ...rows].join('\n');
  }
}
```

### faculty.controller.ts

```typescript
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../common/guards/roles.guard';
import { Roles }        from '../common/decorators/roles.decorator';
import { FacultyService } from './faculty.service';

@Controller('api/faculty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('faculty', 'admin')
export class FacultyController {
  constructor(private facultyService: FacultyService) {}

  // GET /api/faculty/results?department=CS&difficulty=easy&year=2
  @Get('results')
  async getResults(@Query() filters: any) {
    return this.facultyService.getAllResults(filters);
  }

  // GET /api/faculty/stats
  @Get('stats')
  async getStats() {
    return this.facultyService.getSummaryStats();
  }

  // GET /api/faculty/export-csv — downloads CSV file
  @Get('export-csv')
  async exportCSV(@Query() filters: any, @Res() res: Response) {
    const csv = await this.facultyService.exportCSV(filters);
    res.set({
      'Content-Type':        'text/csv',
      'Content-Disposition': 'attachment; filename="assessment-results.csv"',
    });
    res.send(csv);
  }
}
```

---

## 20. Deployment Checklist

### First-time Setup (in order)

```bash
# 1. Clone repo and set environment variables
cp backend/.env.example backend/.env
# Edit .env with your passwords and secrets

# 2. Build all sandbox Docker images
docker build -t coding-sandbox-python     ./sandbox/python
docker build -t coding-sandbox-javascript ./sandbox/javascript
docker build -t coding-sandbox-java       ./sandbox/java
docker build -t coding-sandbox-cpp        ./sandbox/cpp
docker build -t coding-sandbox-c          ./sandbox/c
docker build -t coding-sandbox-r          ./sandbox/r
docker build -t coding-sandbox-html       ./sandbox/html

# 3. Start infrastructure (DB, cache, AI, vector DB)
docker compose up -d postgres redis chroma ollama

# 4. Pull AI models into Ollama (one time — 4.4 GB download)
docker compose exec ollama ollama pull deepseek-coder:6.7b
docker compose exec ollama ollama pull nomic-embed-text

# 5. Run DB migrations
docker compose run --rm api1 npx typeorm migration:run

# 6. Create admin account manually
docker compose exec postgres psql -U platform_user coding_platform \
  -c "INSERT INTO users (id, \"regNumber\", name, department, year, password, role, \"mustChangePassword\") \
      VALUES (gen_random_uuid(), 'ADMIN001', 'Admin', 'ADMIN', 0, '<bcrypt-hashed>', 'admin', false);"

# 7. Seed ChromaDB with initial questions
npx ts-node scripts/seed-vector-store.ts

# 8. Bulk-import students (run as admin)
npx ts-node scripts/bulk-import-students.ts

# 9. Start full stack
docker compose up -d
```

### Security Checklist

```
Authentication
  [ ] JWT_SECRET is at least 64 random characters (openssl rand -hex 64)
  [ ] bcrypt cost factor is 12 in production
  [ ] mustChangePassword = true for all bulk-imported students
  [ ] Admin JWT token not stored in code or .env.example

Database
  [ ] DB password is strong and unique
  [ ] .env is in .gitignore
  [ ] Migrations used (not synchronize: true in TypeORM)
  [ ] Regular automated backups enabled

Sandbox (critical)
  [ ] All containers run with --network none
  [ ] All containers run with --memory 256m
  [ ] All containers run with --cpus 0.5
  [ ] All containers use non-root user
  [ ] 5-second timeout enforced in runner.sh

AI & RAG
  [ ] Ollama only accessible internally (not exposed to internet)
  [ ] ChromaDB not exposed to internet (Docker internal network only)
  [ ] Seed script run and ChromaDB collection count > 0

New Features
  [ ] PDF download tested — correct student name and reg number appear
  [ ] Change password flow tested — mustChangePassword flips to false
  [ ] Bulk import tested — skips duplicates safely
  [ ] Faculty export CSV tested with filters
  [ ] Progress stats update correctly after each submission
```

---

*All packages MIT, Apache 2.0, or BSD licensed — free for academic and commercial use.*
*Zero ongoing AI cost — DeepSeek runs entirely on your college server via Ollama.*
*Question bank grows automatically — every generated question is saved to ChromaDB.*

