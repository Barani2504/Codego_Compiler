import { Component, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Lightbulb,
  Play,
  Zap,
  Rocket,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  ClipboardList,
} from "lucide-react";

// ─── Error Boundary ───────────────────────────────────────────────────────────
class AssessmentErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="page-center">
          <div
            className="card-glass"
            style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 440 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
                color: "var(--yellow)",
              }}
            >
              <AlertTriangle size={48} />
            </div>
            <h2 style={{ marginBottom: "0.5rem" }}>
              Assessment Failed to Load
            </h2>
            <p
              style={{
                color: "var(--text-3)",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
              }}
            >
              {this.state.error}
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LANG_DEFAULTS: Record<string, string> = {
  python:
    "# Write your solution here\ndef solution():\n    pass\n\ndata = input()\nprint(solution())\n",
  javascript:
    '// Write your solution here\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line) => { console.log(line); rl.close(); });\n',
  java: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Read test cases from standard input\n        Scanner sc = new Scanner(System.in);\n        if(sc.hasNext()) {\n            // Example: String input = sc.nextLine();\n        }\n    }\n}\n",
  cpp: "#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Read test cases from standard input\n    string input;\n    if(cin >> input) {\n        // Write your solution here\n    }\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    // Read test cases from standard input\n    // Write your solution here\n    return 0;\n}\n",
  r: '# Write your solution here\ndata <- readLines("stdin", n=1)\ncat(data, "\\n")\n',
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Solution</title>\n</head>\n<body>\n  <!-- Write your solution here -->\n</body>\n</html>\n',
  css: "/* Write your CSS solution here */\nbody { margin: 0; font-family: sans-serif; }\n",
};

function useCountdown(minutes: number) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = () =>
    `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
  return { timeLeft, fmt, start: () => setRunning(true), running };
}

function AssessmentInner() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { question, language, difficulty } = state || {};
  const DIFF_LABELS: Record<string, string> = {
    easy: "Foundational",
    medium: "Intermediate",
    hard: "Advanced",
  };

  const [code, setCode] = useState(
    LANG_DEFAULTS[language] || "# Write your solution here\n",
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "problem" | "constraints" | "hints"
  >("problem");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [started, setStarted] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [runResults, setRunResults] = useState<
    | {
        input: string;
        passed: boolean;
        output: string;
        expected: string;
        exitCode: number;
        isError?: boolean;
        stderr?: string;
        statusDesc?: string;
      }[]
    | null
  >(null);
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);
  const { timeLeft, fmt, start } = useCountdown(
    question?.timeLimitMinutes || 30,
  );

  // Ref to hold the polling interval so it can be cleared on unmount (prevents memory leak)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bottomHeight, setBottomHeight] = useState(280);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setBottomHeight(
        Math.max(100, Math.min(newHeight, window.innerHeight - 200)),
      );
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!question) navigate("/dashboard");
  }, [question, navigate]);

  // Clear polling interval if component unmounts mid-submission (e.g. user navigates away)
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const handleGetHint = async () => {
    if (hintsUsed >= 3) return;
    setLoadingHint(true);

    // Fallback hints in case the question was generated before the dynamic hints update
    const fallbackHints = [
      "Understand the problem constraints first.",
      "Try dry-running with the sample input.",
      "Consider edge cases and how they might affect your logic.",
    ];

    const hints =
      Array.isArray(question?.hints) && question.hints.length >= 3
        ? question.hints
        : fallbackHints;

    await new Promise((r) => setTimeout(r, 800));
    setHint(hints[hintsUsed] || "No more hints available.");
    setHintsUsed((h) => h + 1);
    setLoadingHint(false);
  };

  // Judge0 language IDs (for display only)
  const SUPPORTED_LANGS = ["python", "javascript", "java", "cpp", "c", "r"];

  const handleRun = async () => {
    setRunningCode(true);
    setRunResults(null);
    try {
      const token = localStorage.getItem("token");

      if (!SUPPORTED_LANGS.includes(language)) {
        setRunResults([
          {
            input: "N/A",
            passed: false,
            output: `Language "${language}" is not supported for live execution.`,
            expected: "",
            exitCode: 1,
            isError: true,
            statusDesc: "Unsupported",
          },
        ]);
        return;
      }

      // Run only the 2 visible test cases — the hidden ones are evaluated only on final submission
      const casesToRun = (question?.testCases || []).slice(0, 2);
      if (casesToRun.length === 0) {
        casesToRun.push({
          input: question?.sampleInput || "",
          expectedOutput: question?.sampleOutput || "",
        });
      }

      const res = await axios.post(
        "/api/submissions/run",
        { code, language, testCases: casesToRun },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 },
      );

      setRunResults(res.data);
      setSelectedRunIdx(0);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Cannot reach server.";
      setRunResults([
        {
          input: "Error",
          passed: false,
          output: msg,
          expected: "",
          exitCode: -1,
          isError: true,
          statusDesc: "Network Error",
        },
      ]);
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (token?.startsWith("demo-")) {
        await new Promise((r) => setTimeout(r, 2200));
        const testsPassed = Math.floor(Math.random() * 2) + 3;
        navigate("/results", {
          state: {
            result: {
              score: Math.floor(Math.random() * 35) + 60,
              passed: testsPassed >= 4,
              testsPassed,
              testsTotal: 5,
              testDetails: [
                {
                  index: 1,
                  input: "[2,7,11,15], target=9",
                  expectedOutput: "[0,1]",
                  actualOutput: "[0,1]",
                  passed: true,
                },
                {
                  index: 2,
                  input: "[3,2,4], target=6",
                  expectedOutput: "[1,2]",
                  actualOutput: "[1,2]",
                  passed: true,
                },
                {
                  index: 3,
                  input: "[3,3], target=6",
                  expectedOutput: "[0,1]",
                  actualOutput: "[0,1]",
                  passed: true,
                },
                {
                  index: 4,
                  input: "[-1,-2,-3], target=-4",
                  expectedOutput: "[0,2]",
                  actualOutput: testsPassed >= 4 ? "[0,2]" : "[]",
                  passed: testsPassed >= 4,
                },
                {
                  index: 5,
                  input: "[1000000000,1], target=1000000001",
                  expectedOutput: "[0,1]",
                  actualOutput: testsPassed >= 5 ? "[0,1]" : "[]",
                  passed: testsPassed >= 5,
                },
              ],
              aiFeedback: {
                codeQuality: "Clean and readable with good variable naming",
                timeComplexity: "O(n)",
                qualityScore: 34,
                suggestions: [
                  "Consider adding input validation.",
                  "Add type hints for better readability.",
                ],
                overallComment:
                  "Good approach! You correctly used a hash map for O(n) complexity. Minor improvements around edge case handling would make this excellent.",
              },
              gradedAt: new Date().toISOString(),
            },
            language,
            difficulty,
          },
        });
        return;
      }
      // ── POST code to backend — returns { submissionId, status: 'queued' } ──
      const res = await axios.post(
        "/api/submissions",
        { questionId: question?.id, code, language },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const submissionId: string = res.data.submissionId;
      if (!submissionId) {
        alert("Submission failed: no submission ID returned from server.");
        setSubmitting(false);
        return;
      }

      // ── Poll the lightweight /status endpoint until terminal ──────────────
      let attempts = 0;
      const MAX_ATTEMPTS = 600; // 600 × 2s = 20 min max
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(
            `/api/submissions/${submissionId}/status`,
            {
              headers: { Authorization: `Bearer ${token}` }, // use captured token
            },
          );

          const { status } = statusRes.data;

          if (
            status === "completed" ||
            status === "error" ||
            attempts > MAX_ATTEMPTS
          ) {
            clearInterval(pollRef.current!);
            pollRef.current = null;

            if (status === "error") {
              alert("Grading failed. Please check system logs and try again.");
              setSubmitting(false);
              return;
            }

            if (attempts > MAX_ATTEMPTS) {
              alert(
                "Grading is taking longer than expected (>20 min). The AI engine may be busy. Please try again.",
              );
              setSubmitting(false);
              return;
            }

            // ── Fetch full detail (includes gradeResult) once completed ──────
            try {
              const detailRes = await axios.get(
                `/api/submissions/${submissionId}`,
                {
                  headers: { Authorization: `Bearer ${token}` }, // use captured token
                },
              );

              if (!detailRes.data.gradeResult) {
                alert(
                  "Grading completed but result data is missing. Please try again.",
                );
                setSubmitting(false);
                return;
              }

              navigate("/results", {
                state: {
                  result: detailRes.data.gradeResult,
                  submissionId,
                  language,
                  difficulty,
                },
              });
            } catch {
              alert(
                "Failed to fetch submission result. Please check your connection.",
              );
              setSubmitting(false);
            }
          }
        } catch {
          // Transient polling error — keep trying until attempt limit
        }
      }, 2000);
    } catch {
      setSubmitting(false);
    }
  };

  const timerColor =
    timeLeft < 300
      ? "var(--red)"
      : timeLeft < 600
        ? "var(--yellow)"
        : "var(--text-2)";
  const langExt: Record<string, string> = {
    python: "py",
    javascript: "js",
    java: "java",
    cpp: "cpp",
    c: "c",
    r: "r",
    html: "html",
    css: "css",
  };

  if (!question) return null;

  if (!started) {
    return (
      <div className="page-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="card-glass"
          style={{ maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
              color: "var(--accent)",
            }}
          >
            <Rocket size={48} />
          </motion.div>
          <h2 style={{ marginBottom: "0.75rem" }}>Assessment Ready</h2>
          <div
            style={{
              display: "flex",
              gap: "0.625rem",
              justifyContent: "center",
              marginBottom: "1.5rem",
            }}
          >
            <span className={`badge badge-${difficulty}`}>
              {DIFF_LABELS[difficulty] || difficulty?.toUpperCase()}
            </span>
            <span className="badge badge-info">{language?.toUpperCase()}</span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-2)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <Clock size={14} /> {question.timeLimitMinutes} min
            </span>
          </div>
          <p style={{ marginBottom: "2rem", fontSize: "0.875rem" }}>
            AI has generated a unique problem. Timer starts when you click
            Start.
          </p>
          <div
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10,
              padding: "1rem",
              marginBottom: "2rem",
              textAlign: "left",
              fontSize: "0.82rem",
            }}
          >
            {[
              "Timer starts immediately",
              "Up to 3 AI hints (−5 pts each)",
              "Code executes securely in isolation",
              "Graded by AI + test cases",
            ].map((r) => (
              <div
                key={r}
                style={{
                  color: "var(--text-2)",
                  marginBottom: "0.375rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Check size={12} color="var(--green)" /> {r}
              </div>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary btn-xl"
            onClick={() => {
              setStarted(true);
              start();
            }}
          >
            Start Assessment →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: isDark ? "rgba(7,12,26,0.85)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
          padding: "0.625rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          <span className={`badge badge-${difficulty}`}>
            {DIFF_LABELS[difficulty] || difficulty?.toUpperCase()}
          </span>
          <span className="badge badge-info">{language?.toUpperCase()}</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
            AI-Generated
          </span>
        </div>
        <motion.div
          animate={timeLeft < 300 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "1.1rem",
            fontWeight: 900,
            color: timerColor,
            background: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
            padding: "0.375rem 0.875rem",
            borderRadius: 8,
            border: `1px solid ${timeLeft < 300 ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Clock size={18} /> {fmt()}
        </motion.div>
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            onClick={handleGetHint}
            disabled={hintsUsed >= 3 || loadingHint}
          >
            {loadingHint ? (
              "..."
            ) : (
              <>
                <Lightbulb size={14} /> Hint ({3 - hintsUsed} left)
              </>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-ghost btn-sm"
            onClick={handleRun}
            disabled={runningCode || submitting}
            style={{
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            {runningCode ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                Running...
              </>
            ) : (
              <>
                <Play size={14} /> Run Code
              </>
            )}
          </motion.button>
          <motion.button
            id="submitBtn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            onClick={handleSubmit}
            disabled={submitting || runningCode}
          >
            {submitting ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                Running...
              </>
            ) : (
              <>
                <Zap size={14} /> Submit
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Split layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Problem pane */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            width: "40%",
            minWidth: 300,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div className="tabs" style={{ padding: "0 1.25rem", flexShrink: 0 }}>
            {(["problem"] as const).map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <ClipboardList size={16} /> Problem
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
            {activeTab === "problem" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>
                  {(DIFF_LABELS[difficulty] || language)?.toUpperCase()} Problem
                </h2>
                <div
                  className="markdown-body"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {question.problemStatement?.split(/\n(?:Example|Examples|Sample Input)\b/i)[0]}
                  </ReactMarkdown>
                </div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Sample Input
                  </div>
                  <div className="code-block">{question.sampleInput}</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Expected Output
                  </div>
                  <div className="code-block">{question.sampleOutput}</div>
                </div>

                {/* AI Hint display (since dedicated tab is removed) */}
                {hint && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: "1.5rem",
                      background: "var(--accent-glow)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: 10,
                      padding: "1.25rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--accent)",
                        marginBottom: "0.5rem",
                        letterSpacing: "0.06em",
                      }}
                    >
                      AI HINT #{hintsUsed}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                        color: "var(--text-1)",
                      }}
                    >
                      {hint}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Editor pane */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: isDark
                ? "rgba(7,12,26,0.9)"
                : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
              padding: "0.5rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexShrink: 0,
            }}
          >
            <div className="pulse-dot" />
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-3)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              solution.{langExt[language] || "txt"}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "var(--text-3)",
              }}
            >
              Monaco · VS Code Engine
            </span>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              pointerEvents: isDragging ? "none" : "auto",
            }}
          >
            <Editor
              height="100%"
              language={
                language === "cpp" ? "cpp" : language === "c" ? "c" : language
              }
              value={code}
              onChange={(v) => setCode(v || "")}
              theme={isDark ? "vs-dark" : "light"}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                cursorBlinking: "smooth",
                smoothScrolling: true,
              }}
            />
          </div>

          {/* ── Resizer Handle ── */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              height: "8px",
              background: isDragging ? "var(--accent)" : "transparent",
              cursor: "row-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              zIndex: 50,
              transition: "background 0.2s",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "3px",
                background: "var(--text-3)",
                borderRadius: "2px",
              }}
            />
          </div>

          {/* ── Terminal Output & Test Cases Pane (Always Visible) ── */}
          <div
            style={{
              height: `${bottomHeight}px`,
              borderTop: "1px solid var(--border)",
              background: isDark
                ? "rgba(5,8,18,0.95)"
                : "rgba(248,250,252,0.97)",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexShrink: 0,
            }}
          >
            {/* Left Side: Errors & Output (Catalog) */}
            <div
              style={{
                flex: 1,
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.4rem 1rem",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-glass)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    marginRight: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#ff5f57",
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#febc2e",
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#28c840",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                  }}
                >
                  Console / Errors
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0.875rem 1rem",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.83rem",
                  lineHeight: 1.7,
                }}
              >
                {!runResults ? (
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontStyle: "italic",
                      textAlign: "center",
                      marginTop: "2rem",
                    }}
                  >
                    Run code to see execution log and errors.
                  </div>
                ) : runResults[selectedRunIdx]?.isError ? (
                  <div>
                    <div
                      style={{
                        color: "var(--red)",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {runResults[selectedRunIdx].statusDesc}
                    </div>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        margin: 0,
                        color: "#ff8080",
                      }}
                    >
                      {runResults[selectedRunIdx].output || "Unknown error"}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        marginBottom: "0.3rem",
                      }}
                    >
                      Execution Log
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: "0.625rem",
                        borderRadius: 8,
                        background: runResults[selectedRunIdx]?.passed
                          ? "rgba(34,197,94,0.08)"
                          : "rgba(239,68,68,0.08)",
                        color: runResults[selectedRunIdx]?.passed
                          ? "var(--green)"
                          : "var(--red)",
                        whiteSpace: "pre-wrap",
                        minHeight: 40,
                      }}
                    >
                      {runResults[selectedRunIdx]?.output || "(no output)"}
                    </pre>
                    {runResults[selectedRunIdx]?.stderr && (
                      <div
                        style={{ marginTop: "0.5rem", color: "var(--yellow)" }}
                      >
                        <strong>Stderr:</strong>{" "}
                        {runResults[selectedRunIdx].stderr}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Test Cases */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.4rem 1rem",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-glass)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                  }}
                >
                  Test Cases
                </span>
                {runResults && (
                  <button
                    onClick={() => setRunResults(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-3)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      padding: "0 0.25rem",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.83rem",
                }}
              >
                {!runResults ? (
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontStyle: "italic",
                      textAlign: "center",
                      marginTop: "2rem",
                    }}
                  >
                    Click "Run Code" to verify against the 2 sample cases.
                    Additional hidden cases will be evaluated on Submit.
                  </div>
                ) : runResults.length === 0 ? (
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontStyle: "italic",
                      textAlign: "center",
                      marginTop: "2rem",
                    }}
                  >
                    No test case results.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {runResults.map((result: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "1rem",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "var(--text-2)",
                            }}
                          >
                            Case {idx + 1}
                          </span>
                          {result.isError ? (
                            <span
                              style={{ color: "var(--red)", fontWeight: 700 }}
                            >
                              Execution Failed
                            </span>
                          ) : (
                            <div
                              style={{
                                padding: "0.3rem 0.6rem",
                                borderRadius: 6,
                                background: result.passed
                                  ? "rgba(34,197,94,0.1)"
                                  : "rgba(239,68,68,0.1)",
                                border: `1px solid ${result.passed ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                                color: result.passed
                                  ? "var(--green)"
                                  : "var(--red)",
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              {result.passed ? (
                                <>
                                  <CheckCircle size={14} /> Test passed!
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} /> Output does not match
                                  expected.
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {result.isError ? (
                          <pre
                            style={{
                              margin: 0,
                              textAlign: "left",
                              background: "rgba(239,68,68,0.05)",
                              padding: "0.875rem",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.2)",
                              fontSize: "0.75rem",
                              whiteSpace: "pre-wrap",
                              color: "var(--red)",
                            }}
                          >
                            {result.output}
                          </pre>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-3)",
                                  textTransform: "uppercase",
                                  marginBottom: "0.3rem",
                                }}
                              >
                                Input
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: "0.625rem",
                                  borderRadius: 8,
                                  background: "rgba(0,0,0,0.1)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-1)",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {result.input || ""}
                              </pre>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-3)",
                                  textTransform: "uppercase",
                                  marginBottom: "0.3rem",
                                }}
                              >
                                Expected Output
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: "0.625rem",
                                  borderRadius: 8,
                                  background: "rgba(34,197,94,0.08)",
                                  border: "1px solid rgba(34,197,94,0.25)",
                                  color: "var(--green)",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {result.expected || ""}
                              </pre>
                            </div>
                            {!result.passed && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-3)",
                                    textTransform: "uppercase",
                                    marginBottom: "0.3rem",
                                  }}
                                >
                                  Actual Output
                                </div>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: "0.625rem",
                                    borderRadius: 8,
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    color: "var(--red)",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {result.output || "<empty>"}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {submitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: "rgba(99,102,241,0.1)",
                backdropFilter: "blur(12px)",
                borderTop: "1px solid rgba(99,102,241,0.2)",
                padding: "0.875rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              <div className="spinner" />
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                Running in secure environment · AI evaluation against
                comprehensive test cases...
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function Assessment() {
  return (
    <AssessmentErrorBoundary>
      <AssessmentInner />
    </AssessmentErrorBoundary>
  );
}
