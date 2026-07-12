import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Judge0 CE language IDs.
 * Full list: GET /languages on your Judge0 instance, or:
 *   https://ce.judge0.com/languages
 *
 * html / css are AI-graded only — Judge0 is not called for them.
 */
const JUDGE0_LANG_ID: Record<string, number | null | undefined> = {
  python:     71,   // Python 3 (3.8.1)
  javascript: 63,   // Node.js (12.14.0)
  java:       62,   // Java (OpenJDK 13.0.1)
  cpp:        54,   // C++ (GCC 9.2.0)
  c:          50,   // C (GCC 9.2.0)
  r:          80,   // R (4.0.0)
  html:       null, // AI-graded; no execution step
  css:        null, // AI-graded; no execution step
};

/**
 * Judge0 CE status IDs (the ones we surface to the caller).
 *   1  In Queue
 *   2  Processing
 *   3  Accepted  ← success
 *   4  Wrong Answer
 *   5  Time Limit Exceeded
 *   6  Compilation Error
 *   7  Runtime Error (SIGSEGV)
 *   8  Runtime Error (SIGXFSZ)
 *   9  Runtime Error (SIGFPE)
 *   10 Runtime Error (SIGABRT)
 *   11 Runtime Error (NZEC)
 *   12 Runtime Error (Other)
 *   13 Internal Error
 *   14 Exec Format Error
 */

export interface ExecutionResult {
  input:      string;
  output:     string;
  exitCode:   number;
  stderr:     string;
  statusId:   number;
  statusDesc: string;
}

/**
 * ExecutionService — runs code via self-hosted Judge0 CE.
 *
 * judge0.conf has ENABLE_WAIT_RESULT=true which allows a single
 * POST /submissions?wait=true call — synchronous, no polling loop needed.
 *
 * Requests and responses use base64 encoding (base64_encoded=true) so that
 * any binary or special-character content is transmitted safely.
 */
@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  private get judge0Base(): string {
    return process.env.JUDGE0_URL || 'http://localhost:2358';
  }

  /** Encode a string to base64 for Judge0 submission */
  private b64(s: string): string {
    return Buffer.from(s || '').toString('base64');
  }

  /** Decode a base64 string returned by Judge0 (returns '' for null/undefined) */
  private b64decode(s: string | null | undefined): string {
    if (!s) return '';
    try {
      return Buffer.from(s, 'base64').toString('utf8');
    } catch {
      return s; // already plain text — return as-is
    }
  }

  // ── Run a single test case against Judge0 ───────────────────────────────
  async runSingle(
    code:     string,
    language: string,
    input:    string,
  ): Promise<ExecutionResult> {
    const langId = JUDGE0_LANG_ID[language];

    // Languages graded purely by AI (html, css) — return a neutral result
    if (langId === null) {
      return {
        input,
        output:     '',
        exitCode:   0,
        stderr:     '',
        statusId:   3,
        statusDesc: 'AI Graded',
      };
    }

    if (langId === undefined) {
      return {
        input,
        output:     '',
        exitCode:   1,
        stderr:     `Unsupported language: ${language}`,
        statusId:   11,
        statusDesc: 'Unsupported Language',
      };
    }

    let finalCode  = code;
    let finalInput = input;

    // ── JavaScript: function-call mode ────────────────────────────────────
    // JS questions are function-based (candidate(args) → return value), not
    // stdin/stdout programs. Input is stored as a JSON array of arguments.
    // We wrap the student's code to call the function and print the JSON result.
    if (language === 'javascript') {
      let isJsonArgs = false;
      let parsedArgs: any[] = [];
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
          isJsonArgs = true;
          parsedArgs = parsed;
        }
      } catch { /* plain stdin — pass through as-is */ }

      if (isJsonArgs) {
        const fnMatch = code.match(/^function\s+(\w+)\s*\(/m);
        const fnName  = fnMatch ? fnMatch[1] : null;

        if (fnName) {
          const argsJson = JSON.stringify(parsedArgs);
          finalCode  = `${code}\n\nconst __args = ${argsJson};\nconst __result = ${fnName}(...__args);\nprocess.stdout.write(JSON.stringify(__result) + '\\n');`;
          finalInput = ''; // args are embedded in code; stdin must be empty
        }
      }
    }

    // ── Java: inject lightweight custom Scanner ───────────────────────────
    // Judge0 uses OpenJDK; java.util.Scanner is available but we inject our
    // own to avoid "import already declared" conflicts in some problem scaffolds.
    if (language === 'java') {
      // Strip single-type Scanner imports to avoid shadowing issues
      finalCode = finalCode.replace(/import\s+java\s*\.\s*util\s*\.\s*Scanner\s*;/g, '');
      // Replace fully-qualified Scanner references
      finalCode = finalCode.replace(/\bjava\s*\.\s*util\s*\.\s*Scanner\b/g, 'Scanner');
      // Append lightweight custom Scanner implementation
      finalCode += `\nclass Scanner {
    private final java.io.BufferedReader br;
    private java.util.StringTokenizer st;
    private String nextToken;

    public Scanner(java.io.InputStream is) {
        br = new java.io.BufferedReader(new java.io.InputStreamReader(is));
    }

    private boolean populateToken() {
        if (nextToken != null) return true;
        while (st == null || !st.hasMoreTokens()) {
            try {
                String line = br.readLine();
                if (line == null) return false;
                st = new java.util.StringTokenizer(line);
            } catch (Exception e) {
                return false;
            }
        }
        nextToken = st.nextToken();
        return true;
    }

    public boolean hasNext() {
        return populateToken();
    }

    public String next() {
        if (!populateToken()) throw new java.util.NoSuchElementException();
        String temp = nextToken;
        nextToken = null;
        return temp;
    }

    public int nextInt() {
        return Integer.parseInt(next());
    }

    public long nextLong() {
        return Long.parseLong(next());
    }

    public double nextDouble() {
        return Double.parseDouble(next());
    }

    public float nextFloat() {
        return Float.parseFloat(next());
    }

    public boolean hasNextInt() {
        if (!populateToken()) return false;
        try {
            Integer.parseInt(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public boolean hasNextLong() {
        if (!populateToken()) return false;
        try {
            Long.parseLong(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public boolean hasNextDouble() {
        if (!populateToken()) return false;
        try {
            Double.parseDouble(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public String nextLine() {
        if (nextToken != null) {
            String temp = nextToken;
            nextToken = null;
            StringBuilder sb = new StringBuilder(temp);
            if (st != null) {
                while (st.hasMoreTokens()) {
                    sb.append(" ").append(st.nextToken());
                }
            }
            return sb.toString();
        }
        st = null;
        try {
            return br.readLine();
        } catch (Exception e) {
            return null;
        }
    }

    public void close() {
        try {
            br.close();
        } catch (Exception e) {}
    }
}`;
    }

    try {
      // ── Submit to Judge0 ──────────────────────────────────────────────────
      // ?wait=true    → synchronous result (requires ENABLE_WAIT_RESULT=true in judge0.conf)
      // ?base64_encoded=true → encode source_code/stdin in request; decode stdout/stderr in response
      const res = await axios.post(
        `${this.judge0Base}/submissions?base64_encoded=true&wait=true`,
        {
          source_code:      this.b64(finalCode),
          language_id:      langId,
          stdin:            this.b64(finalInput),
          cpu_time_limit:   10,       // seconds
          wall_time_limit:  15,       // wall-clock seconds (includes process spawn)
          memory_limit:     262144,   // KB → 256 MB
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000, // 30s axios timeout — covers slow compiles
        },
      );

      const data = res.data;
      const status: { id: number; description: string } = data.status ?? { id: 13, description: 'Internal Error' };

      const stdout         = this.b64decode(data.stdout).trim();
      const stderr         = this.b64decode(data.stderr).trim();
      const compileOutput  = this.b64decode(data.compile_output).trim();
      const exitCode: number = data.exit_code ?? (status.id === 3 ? 0 : 1);

      // ── Compilation error ─────────────────────────────────────────────
      if (status.id === 6) {
        return {
          input,
          output:     '',
          exitCode:   1,
          stderr:     compileOutput || stderr || 'Compilation failed',
          statusId:   6,
          statusDesc: 'Compilation Error',
        };
      }

      // ── Time limit exceeded ───────────────────────────────────────────
      if (status.id === 5) {
        return {
          input,
          output:     '',
          exitCode:   1,
          stderr:     'Time Limit Exceeded',
          statusId:   5,
          statusDesc: 'Time Limit Exceeded',
        };
      }

      // ── Runtime error variants (7-12, 14) ────────────────────────────
      if (status.id >= 7 && status.id <= 14) {
        return {
          input,
          output:     stdout,
          exitCode:   exitCode || 1,
          stderr:     stderr || compileOutput || status.description,
          statusId:   status.id,
          statusDesc: status.description,
        };
      }

      // ── Accepted / Wrong Answer / other ──────────────────────────────
      return {
        input,
        output:     stdout,
        exitCode,
        stderr,
        statusId:   status.id,
        statusDesc: status.description,
      };

    } catch (err: any) {
      this.logger.error('Judge0 execution failed:', err.message);
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND';
      return {
        input,
        output:     '',
        exitCode:   1,
        stderr:     isNetwork
          ? 'Cannot connect to Judge0 execution service. Is it running?'
          : (err.response?.data?.message ?? err.message),
        statusId:   13,
        statusDesc: 'Connection Error',
      };
    }
  }

  // ── Run all test cases concurrently (unchanged public signature) ─────────
  async runAllTestCases(
    code:      string,
    language:  string,
    testCases: { input: string; expectedOutput: string }[],
  ): Promise<ExecutionResult[]> {
    return Promise.all(
      testCases.map((tc) => this.runSingle(code, language, tc.input)),
    );
  }
}
