import { Injectable, Logger } from '@nestjs/common';
import { OllamaCircuitBreakerService } from './ollama-circuit-breaker.service';
import axios from 'axios';

// ─── Recommended Models ──────────────────────────────────────────────────────
// For fast, LeetCode-style grading:
//   • qwen2.5-coder:1.5b (1GB, ~2-5s response)  ← Best for speed
//   • qwen2.5-coder:3b   (2GB, ~3-8s response)  ← Best balance
//
// Set via: OLLAMA_GRADING_MODEL=qwen2.5-coder:1.5b

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(private readonly circuitBreaker: OllamaCircuitBreakerService) {}

  async grade(
    code: string,
    language: string,
    difficulty: string,
    problemStatement: string,
    testCases: { input: string; expectedOutput: string }[],
    executionResults: { input: string; output: string; exitCode: number }[],
  ) {
    // Stage 1: Deterministic test case comparison
    // Filter out invalid test cases where expectedOutput is empty (AI generation artifact).
    // IMPORTANT: preserve the original index so we look up the correct executionResults entry.
    const indexedTestCases = testCases.map((tc, idx) => ({ tc, idx }));
    const validIndexed = indexedTestCases.filter(
      ({ tc }) => tc.expectedOutput && tc.expectedOutput.trim().length > 0,
    );
    const effectiveIndexed =
      validIndexed.length > 0 ? validIndexed : indexedTestCases;

    const testDetails = effectiveIndexed.map(({ tc, idx }, i) => {
      const exec = executionResults[idx]; // use original index — not the filtered position
      const actualOutput = exec?.output?.trim() || '';
      const expectedOutput = tc.expectedOutput.trim();
      return {
        index: i + 1,
        input: tc.input,
        expectedOutput,
        actualOutput,
        passed:
          this.compareOutput(actualOutput, expectedOutput) &&
          exec?.exitCode === 0,
      };
    });

    const testsPassed = testDetails.filter((t) => t.passed).length;
    const testsTotal = testDetails.length;

    // Stage 2: AI quality analysis
    const aiFeedback = await this.analyzeCode(
      code,
      language,
      difficulty,
      problemStatement,
      testsPassed,
      testsTotal,
    );

    const isDegraded = !!aiFeedback?.degraded;
    const testScore =
      testsTotal > 0
        ? isDegraded
          ? Math.round((testsPassed / testsTotal) * 100)
          : Math.round((testsPassed / testsTotal) * 60)
        : (isDegraded ? 60 : 30);

    const finalScore = isDegraded
      ? testScore
      : Math.min(100, testScore + (aiFeedback.qualityScore || 0));

    const isPass =
      testsTotal > 0
        ? testsPassed === testsTotal || (testsPassed / testsTotal >= 0.6 && finalScore >= 60)
        : finalScore >= 60;

    return {
      testsPassed,
      testsTotal,
      score: finalScore,
      passed: isPass,
      testDetails,
      aiFeedback,
      gradedAt: new Date().toISOString(),
    };
  }

  /**
   * Same as grade() but accepts pre-computed AI feedback.
   * Used by the processor when AI and execution run in parallel.
   */
  async gradeWithFeedback(
    code: string,
    language: string,
    difficulty: string,
    problemStatement: string,
    testCases: { input: string; expectedOutput: string }[],
    executionResults: { input: string; output: string; exitCode: number }[],
    aiFeedback: Awaited<ReturnType<GradingService['analyzeCodePublic']>>,
  ) {
    const indexedTestCases = testCases.map((tc, idx) => ({ tc, idx }));
    const validIndexed = indexedTestCases.filter(
      ({ tc }) => tc.expectedOutput && tc.expectedOutput.trim().length > 0,
    );
    const effectiveIndexed =
      validIndexed.length > 0 ? validIndexed : indexedTestCases;

    const testDetails = effectiveIndexed.map(({ tc, idx }, i) => {
      const exec = executionResults[idx];
      const actualOutput = exec?.output?.trim() || '';
      const expectedOutput = tc.expectedOutput.trim();
      return {
        index: i + 1,
        input: tc.input,
        expectedOutput,
        actualOutput,
        passed:
          this.compareOutput(actualOutput, expectedOutput) &&
          exec?.exitCode === 0,
      };
    });

    const testsPassed = testDetails.filter((t) => t.passed).length;
    const testsTotal = testDetails.length;
    const isDegraded = !!aiFeedback?.degraded;

    // When degraded, score purely on test cases rescaled to 100 points
    const testScore =
      testsTotal > 0
        ? isDegraded
          ? Math.round((testsPassed / testsTotal) * 100)
          : Math.round((testsPassed / testsTotal) * 60)
        : (isDegraded ? 60 : 30);

    // Recalculate the AI qualityScore now that we know actual pass/fail results.
    // Clamp it based on test performance so a bad submission can't get a high AI score.
    const qualityScore = (() => {
      if (isDegraded) return 0;
      const raw = aiFeedback.qualityScore;
      const aiScore =
        raw !== undefined && raw >= 0
          ? Math.min(40, raw)
          : testsPassed === testsTotal
            ? 35
            : 20;
      // Hard cap based on test results to prevent inflated scores
      if (testsTotal > 0 && testsPassed === 0) return Math.min(aiScore, 15); // all failed → max 15
      if (testsTotal > 0 && testsPassed < testsTotal / 2)
        return Math.min(aiScore, 25); // <50% passed → max 25
      return aiScore;
    })();

    const finalScore = isDegraded ? testScore : Math.min(100, testScore + qualityScore);
    const isPass =
      testsTotal > 0
        ? testsPassed === testsTotal || (testsPassed / testsTotal >= 0.6 && finalScore >= 60)
        : finalScore >= 60;

    return {
      testsPassed,
      testsTotal,
      score: finalScore,
      passed: isPass,
      testDetails,
      aiFeedback: { ...aiFeedback, qualityScore },
      gradedAt: new Date().toISOString(),
    };
  }

  /**
   * Run AI analysis independently — call this in parallel with Piston execution
   * so the total grading time = max(Piston, Ollama) instead of Piston + Ollama.
   */
  async analyzeCodePublic(
    code: string,
    language: string,
    difficulty: string,
    problemStatement: string,
  ) {
    return this.analyzeCode(
      code,
      language,
      difficulty,
      problemStatement,
      -1,
      -1,
    );
  }

  private compareOutput(actual: string, expected: string): boolean {
    const actualTokens = actual.split(/\s+/).filter((t) => t.length > 0);
    const expectedTokens = expected.split(/\s+/).filter((t) => t.length > 0);
    return (
      actualTokens.length === expectedTokens.length &&
      actualTokens.every((t, i) => t === expectedTokens[i])
    );
  }

  private async analyzeCode(
    code: string,
    language: string,
    difficulty: string,
    problemStatement: string,
    testsPassed: number,
    testsTotal: number,
  ) {
    // Sentinel -1/-1 means this was called in parallel before test results were known.
    // Use a neutral prompt so the AI doesn't incorrectly praise or penalise the code.
    const failedTests = testsTotal === -1 ? -1 : testsTotal - testsPassed;
    const testContext =
      testsTotal === -1
        ? `\nEvaluate the code for logic correctness, efficiency, and style without knowing the test results.`
        : failedTests > 0
          ? `\nCRITICAL ALERT: The student's code FAILED ${failedTests} out of ${testsTotal} test cases! Do NOT praise the code. You MUST locate the exact logical error (e.g. wrong index check, off-by-one error) causing it to fail and point it out directly.`
          : `\nThe student's code passed all test cases. Focus on optimization and readability.`;

    const prompt = `You are a strict college professor grading a ${difficulty.toUpperCase()} ${language.toUpperCase()} programming assignment.

PROBLEM:
${problemStatement}

STUDENT CODE:
\`\`\`${language}
${code}
\`\`\`

TEST RESULTS:
- The student's code passed ${testsPassed} out of ${testsTotal} test cases.
${testContext}

TASK:
1. Analyze the student's code for logic, efficiency, and style.
2. Determine the time complexity (Big-O).
3. Provide a Quality Score (0-40) based on the guide below.
4. Provide specific suggestions for improvement.

QUALITY SCORE RUBRIC (0-40 points):
Correctness (0-20):  All tests passed = 20 | Some tests passed = 10-15 | All tests failed = 0-5
Efficiency (0-10):   Optimal time complexity = 10 | Acceptable = 6-9 | Inefficient = 0-5
Code Quality (0-10): Clean, readable, well-named = 10 | Acceptable = 6-9 | Poor style = 0-5

Examples:
- All tests passed, O(n), clean code = 38-40
- All tests passed, O(n²), messy code = 30-33
- Some tests failed, O(n), decent code = 18-22
- All tests failed, O(n³), terrible code = 0-5

You MUST return a JSON object exactly like this (replace every placeholder with your actual assessment — do NOT copy these placeholder values verbatim):
{
  "_reasoning": "<your step-by-step logic and complexity analysis here>",
  "codeQuality": "<one sentence about code style>",
  "timeComplexity": "<Big-O notation e.g. O(n)>",
  "qualityScore": <integer 0-40 based on the guide above — do NOT use 35 as a default, derive the score from the code>,
  "suggestions": [
    "<specific improvement referencing actual variable/line from the code>"
  ],
  "overallComment": "<final summary of the work>"
}

STRICT RULE: Do NOT use the words 'placeholder' or 'suggestion 1' in your response. Reference the student's actual code (e.g., mention variable names like 'distinctSubs' or 'S').`;

    try {
      const ollamaData = await this.circuitBreaker.execute(
        async () => {
          const res = await axios.post(
            `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`,
            {
              model:
                process.env.OLLAMA_GRADING_MODEL ||
                process.env.OLLAMA_MODEL ||
                'qwen2.5-coder:1.5b',
              prompt,
              stream: false,
              format: 'json',
              options: {
                temperature: 0.1, // More deterministic/consistent scoring
                num_predict: 512, // Smaller = faster (JSON response is small)
                top_p: 0.9,
                top_k: 40,
              },
            },
            {
              timeout: 60000, // 60-second cap to allow model cold start / CPU inference
            },
          );
          return res.data; // return just the payload, not the full AxiosResponse
        },
        // ── Circuit-breaker fallback: return degraded result ──────────────
        // When Ollama is down, we score purely on test cases (no AI component).
        // The 'degraded' flag tells the processor to rescale scoring and marks
        // the submission for a faculty-side re-grade queue once Ollama recovers.
        () => ({
          response: JSON.stringify({
            codeQuality: 'AI analysis temporarily unavailable',
            timeComplexity: 'N/A',
            qualityScore: -1,
            suggestions: ['AI qualitative review will be available after system recovery.'],
            overallComment: 'Scored on test cases only — AI review temporarily degraded.',
            degraded: true,
          }),
        }),
        60_000,
      );

      const raw = ollamaData.response;
      let parsed: any = {};
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');

      if (start !== -1) {
        let clean =
          end > start ? raw.substring(start, end + 1) : raw.substring(start);
        const parseAttempts = [
          clean,
          clean + '"}',
          clean + '"]}',
          clean + '}',
          clean + '}}',
        ];

        let success = false;
        for (const attempt of parseAttempts) {
          try {
            parsed = JSON.parse(attempt);
            success = true;
            break;
          } catch (e) {
            continue;
          }
        }

        if (!success) {
          console.warn('Failed to parse extracted JSON. Using fallback.');
        }
      } else {
        console.warn('No JSON object found in AI response. Using fallback.');
      }

      // Normalize: map any alternate field names the AI might use to the standard schema
      const toStr = (v: any, fallback = 'N/A'): string => {
        if (v === undefined || v === null || v === '') return fallback;
        if (typeof v === 'object' && !Array.isArray(v))
          return JSON.stringify(v);
        return String(v);
      };

      return {
        codeQuality: toStr(
          parsed.codeQuality ??
            parsed.quality ??
            parsed.readableCode ??
            parsed.code_quality ??
            parsed.style,
          'Good',
        ),
        timeComplexity: toStr(
          parsed.timeComplexity ??
            parsed.complexity ??
            parsed.time_complexity ??
            parsed.complexityScore ??
            'O(n)',
        ),
        qualityScore: (() => {
          const val =
            parsed.qualityScore ??
            parsed.score ??
            parsed.codeReviewIndex ??
            parsed.maintainabilityIndex ??
            parsed.quality;
          const num = parseInt(String(val), 10);
          if (!isNaN(num)) return Math.min(40, Math.max(0, num));
          // Fallback: -1 signals unknown (parallel call) — gradeWithFeedback will clamp it
          return testsTotal === -1 ? -1 : testsPassed === testsTotal ? 35 : 20;
        })(),
        overallComment: toStr(
          parsed.overallComment ??
            parsed.comment ??
            parsed.feedback ??
            parsed.overall ??
            parsed.review,
          'Code looks good.',
        ),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map((s) => toStr(s)).filter((s) => s !== 'N/A')
          : parsed.suggestions
            ? [toStr(parsed.suggestions)]
            : [],
      };
    } catch (err) {
      this.logger.error('AI grading failed:', err);
      return {
        codeQuality: 'Analysis Unavailable',
        timeComplexity: 'O(n) Estimated',
        qualityScore: testsPassed === testsTotal ? 35 : 20,
        suggestions: ['Review your logic for any edge cases.'],
        overallComment:
          'Automated test cases passed. Code quality analysis fell back to default.',
        degraded: true,
      };
    }
  }
}
