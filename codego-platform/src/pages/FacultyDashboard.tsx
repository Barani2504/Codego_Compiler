import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tilt from "react-parallax-tilt";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  GraduationCap,
  Download,
  Trophy,
  BarChart,
  Check,
  X,
  FileText,
} from "lucide-react";

const DIFF_LABELS: Record<string, string> = {
  easy: "Foundational",
  medium: "Intermediate",
  hard: "Advanced",
};
const DIFF_COLORS: Record<string, string> = {
  easy: "var(--green)",
  medium: "var(--yellow)",
  hard: "var(--red)",
};

export default function FacultyDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  const [filterDiff, setFilterDiff] = useState<string>("all"); // all, easy, medium, hard
  const [filterPass, setFilterPass] = useState<string>("all"); // all, pass, fail
  const [filterSort, setFilterSort] = useState<string>("newest"); // newest, high_marks, low_marks
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPassFilter, setModalPassFilter] = useState("all");
  const [modalSort, setModalSort] = useState("high_marks");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token?.startsWith("demo-")) {
          setStats({
            byDiff: [
              { difficulty: "easy", total: "45", passed: "40", avgScore: "88" },
              {
                difficulty: "medium",
                total: "32",
                passed: "20",
                avgScore: "65",
              },
              { difficulty: "hard", total: "12", passed: "3", avgScore: "40" },
            ],
            topStudents: [
              {
                name: "Arun Kumar",
                regNumber: "21CS001",
                department: "CS",
                averageScore: 88,
                totalPassed: 14,
              },
              {
                name: "Priya Sharma",
                regNumber: "21CS002",
                department: "CS",
                averageScore: 85,
                totalPassed: 12,
              },
              {
                name: "Rahul Singh",
                regNumber: "21IT001",
                department: "IT",
                averageScore: 80,
                totalPassed: 10,
              },
              {
                name: "Sneha Patel",
                regNumber: "21EC015",
                department: "EC",
                averageScore: 78,
                totalPassed: 9,
              },
            ],
          });
          setResults([
            {
              id: 1,
              regNumber: "21CS001",
              name: "Arun Kumar",
              department: "CS",
              language: "python",
              difficulty: "hard",
              score: 88,
              passed: true,
              submittedAt: new Date().toISOString(),
            },
            {
              id: 2,
              regNumber: "21CS002",
              name: "Priya Sharma",
              department: "CS",
              language: "javascript",
              difficulty: "medium",
              score: 95,
              passed: true,
              submittedAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 3,
              regNumber: "21IT001",
              name: "Rahul Singh",
              department: "IT",
              language: "java",
              difficulty: "hard",
              score: 45,
              passed: false,
              submittedAt: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: 4,
              regNumber: "21EC015",
              name: "Sneha Patel",
              department: "EC",
              language: "cpp",
              difficulty: "easy",
              score: 100,
              passed: true,
              submittedAt: new Date(Date.now() - 10000000).toISOString(),
            },
            {
              id: 5,
              regNumber: "21CS001",
              name: "Arun Kumar",
              department: "CS",
              language: "c",
              difficulty: "medium",
              score: 75,
              passed: true,
              submittedAt: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 6,
              regNumber: "21EC016",
              name: "Sanjay Gupta",
              department: "EC",
              language: "python",
              difficulty: "easy",
              score: 30,
              passed: false,
              submittedAt: new Date(Date.now() - 90000000).toISOString(),
            },
          ]);
        } else {
          const [statsRes, resultsRes] = await Promise.all([
            axios.get("/api/faculty/stats", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("/api/faculty/results", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          setStats(statsRes.data);
          setResults(resultsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownloadPDF = async (
    e: React.MouseEvent,
    submissionId: string,
    language: string,
    difficulty: string,
  ) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (token?.startsWith("demo-")) {
      alert("PDF download is simulated in demo mode.");
      return;
    }
    if (!submissionId) {
      alert("Submission ID not found.");
      return;
    }

    try {
      const res = await axios.get(`/api/results/${submissionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `result-${language || "code"}-${difficulty || "assessment"}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download PDF. Please try again later.");
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem("token");
    if (token?.startsWith("demo-")) {
      alert("CSV export simulated in demo mode.");
      return;
    }

    try {
      const response = await axios.get("/api/faculty/export-csv", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "assessment-results.csv");
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download CSV report.");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div
          className="skeleton"
          style={{ height: 90, borderRadius: 12, marginBottom: "1.5rem" }}
        />
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ flex: 1, height: 160, borderRadius: 12 }}
            />
          ))}
        </div>
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  const chartData = ["easy", "medium", "hard"].map((difficulty) => {
    const d = stats?.byDiff?.find((x: any) => x.difficulty === difficulty) || {
      difficulty,
      total: 0,
      passed: 0,
    };
    const passedStudents = results
      .filter((r) => r.difficulty === difficulty && r.passed)
      .map((r) => r.name);
    const failedStudents = results
      .filter((r) => r.difficulty === difficulty && !r.passed)
      .map((r) => r.name);

    const uniquePassed = Array.from(new Set(passedStudents));
    const uniqueFailed = Array.from(new Set(failedStudents));

    return {
      name: DIFF_LABELS[difficulty] || difficulty,
      difficulty,
      Passed: parseInt(d.passed || 0),
      Failed: parseInt(d.total || 0) - parseInt(d.passed || 0),
      passedStudents: uniquePassed,
      failedStudents: uniqueFailed,
    };
  });

  const tooltipStyle = {
    background: isDark ? "rgba(13,17,23,0.95)" : "rgba(255,255,255,0.97)",
    backdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-1)",
    fontSize: "0.82rem",
    boxShadow: "var(--card-shadow)",
    padding: 0,
    overflow: "hidden",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={tooltipStyle}>
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border)",
              fontWeight: 700,
              background: "var(--bg-2)",
            }}
          >
            {label}
          </div>
          <div
            style={{
              padding: "0.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {payload.map((entry: any, index: number) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: entry.color,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  <span>{entry.name}:</span>
                  <span>{entry.value}</span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-3)",
                    maxHeight: 80,
                    overflowY: "auto",
                    lineHeight: 1.4,
                  }}
                >
                  {entry.name === "Passed" && data.passedStudents.length > 0
                    ? data.passedStudents.join(", ")
                    : null}
                  {entry.name === "Failed" && data.failedStudents.length > 0
                    ? data.failedStudents.join(", ")
                    : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const item = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 350, damping: 28 },
    },
  };

  const RANK_COLORS = ["#f59e0b", "#9ca3af", "#b45309", "var(--text-3)"];

  const filteredResults = results
    .filter((r) => {
      if (filterDiff !== "all" && r.difficulty !== filterDiff) return false;
      if (filterPass === "pass" && !r.passed) return false;
      if (filterPass === "fail" && r.passed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !r.name?.toLowerCase().includes(q) &&
          !r.regNumber?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filterSort === "newest")
        return (
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      if (filterSort === "high_marks") return b.score - a.score;
      if (filterSort === "low_marks") return a.score - b.score;
      return 0;
    });

  return (
    <div
      className="container"
      style={{
        paddingTop: "2rem",
        paddingBottom: "3rem",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-between"
        style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              boxShadow: "0 6px 20px var(--accent-glow)",
              color: "white",
            }}
          >
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, lineHeight: 1.1 }}>Faculty Dashboard</h1>
            <p
              style={{
                margin: 0,
                color: "var(--text-3)",
                fontSize: "0.82rem",
                marginTop: 2,
              }}
            >
              Real-time student submission analytics
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-secondary"
          onClick={handleExport}
        >
          <Download size={16} /> Export CSV Report
        </motion.button>
      </motion.div>

      {/* Difficulty stat cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid-3"
        style={{ marginBottom: "2rem" }}
      >
        {["easy", "medium", "hard"].map((difficulty) => {
          const s = stats?.byDiff?.find(
            (d: any) => d.difficulty === difficulty,
          ) || { difficulty, total: 0, passed: 0, avgScore: 0 };
          const color = DIFF_COLORS[difficulty];
          const pct = Math.round(parseFloat(s.avgScore) || 0);
          const passRate =
            s.total > 0
              ? Math.round((parseInt(s.passed) / parseInt(s.total)) * 100)
              : 0;

          return (
            <motion.div
              key={difficulty}
              variants={item}
              onClick={() => {
                setSelectedBox(difficulty);
                setModalSearch("");
                setModalPassFilter("all");
                setModalSort("high_marks");
              }}
              style={{ cursor: "pointer" }}
            >
              <Tilt
                tiltMaxAngleX={5}
                tiltMaxAngleY={5}
                scale={1.02}
                transitionSpeed={500}
                style={{ height: "100%" }}
              >
                <div
                  className="card-glass"
                  style={{
                    borderTop: `3px solid ${color}`,
                    height: "100%",
                    boxShadow: "var(--card-shadow)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = `0 8px 32px ${color}33`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = "var(--card-shadow)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div>
                      <span
                        className={`badge badge-${difficulty}`}
                        style={{
                          marginBottom: "0.5rem",
                          display: "inline-flex",
                        }}
                      >
                        {DIFF_LABELS[difficulty]}
                      </span>
                      <div
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: "2.25rem",
                          fontWeight: 900,
                          color: "var(--text-1)",
                          lineHeight: 1,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {pct}%
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-3)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Avg Score
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          color,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {passRate}%
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Pass Rate
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[
                      { v: s.total, l: "Total" },
                      { v: s.passed, l: "Passed", c: "var(--green)" },
                    ].map((x) => (
                      <div
                        key={x.l}
                        style={{
                          flex: 1,
                          background: "var(--bg-2)",
                          padding: "0.625rem",
                          borderRadius: 8,
                          textAlign: "center",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1rem",
                            fontWeight: 800,
                            color: x.c || "var(--text-1)",
                          }}
                        >
                          {x.v}
                        </div>
                        <div
                          style={{
                            fontSize: "0.62rem",
                            color: "var(--text-3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {x.l}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Tilt>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main grid */}
      <div className="grid-2" style={{ gap: "1.25rem", alignItems: "start" }}>
        {/* Left col */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card-glass"
          >
            <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Trophy size={18} color="var(--yellow)" /> Top Performers
              </h3>
              <span className="badge badge-accent">Leaderboard</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {stats?.topStudents?.map((student: any, i: number) => (
                <div
                  key={student.regNumber}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1rem",
                    background:
                      i === 0
                        ? "linear-gradient(90deg, rgba(245,158,11,0.06), transparent)"
                        : "var(--bg-hover)",
                    borderRadius: 10,
                    border: `1px solid ${i === 0 ? "rgba(245,158,11,0.15)" : "var(--border)"}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        i === 0 ? "rgba(245,158,11,0.15)" : "var(--bg-3)",
                      color: RANK_COLORS[i] || "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      flexShrink: 0,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: i === 0 ? "var(--neon-amber)" : "var(--text-1)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {student.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                      {student.regNumber} · {student.department}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "var(--accent)",
                        fontSize: "1rem",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {Math.round(student.averageScore)}%
                    </div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--green)",
                        fontWeight: 600,
                      }}
                    >
                      {student.totalPassed} passed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bar chart */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card-glass"
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "1.25rem",
                fontSize: "1rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <BarChart size={18} /> Pass vs Fail by Tier
            </h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartData}
                  margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "var(--text-3)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-3)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "var(--bg-hover)" }}
                  />
                  <Bar
                    dataKey="Passed"
                    fill="var(--green)"
                    radius={[4, 4, 0, 0]}
                    name="Passed"
                    onClick={(data) => {
                      setSelectedBox(data.difficulty);
                      setModalSearch("");
                      setModalPassFilter("pass");
                      setModalSort("high_marks");
                    }}
                  />
                  <Bar
                    dataKey="Failed"
                    fill="var(--red)"
                    radius={[4, 4, 0, 0]}
                    name="Failed"
                    onClick={(data) => {
                      setSelectedBox(data.difficulty);
                      setModalSearch("");
                      setModalPassFilter("fail");
                      setModalSort("low_marks");
                    }}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem' }}>
              {["easy", "medium", "hard"].map(diff => (
                <button
                  key={diff}
                  onClick={() => { setSelectedBox(diff); setModalSearch(""); setModalPassFilter("all"); setModalSort("high_marks"); }}
                  style={{
                    background: 'transparent', border: 'none', color: DIFF_COLORS[diff],
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                    padding: '0.25rem 0.5rem', borderRadius: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  View {DIFF_LABELS[diff]} →
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right col — submissions log */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="card-glass"
          style={{
            padding: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: 800,
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div className="pulse-dot" />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                Live Submissions
              </h3>
              <span
                className="badge badge-accent"
                style={{ marginLeft: "auto" }}
              >
                {filteredResults.length}{" "}
                {filteredResults.length === 1 ? "result" : "results"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search student or reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-2)",
                  color: "var(--text-1)",
                  fontSize: "0.85rem",
                  flex: "1 1 140px",
                  minWidth: 140,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <select
                value={filterDiff}
                onChange={(e) => setFilterDiff(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-2)",
                  color: "var(--text-1)",
                  fontSize: "0.85rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Levels</option>
                <option value="easy">Foundational</option>
                <option value="medium">Intermediate</option>
                <option value="hard">Advanced</option>
              </select>
              <select
                value={filterPass}
                onChange={(e) => setFilterPass(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-2)",
                  color: "var(--text-1)",
                  fontSize: "0.85rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Status</option>
                <option value="pass">Passed</option>
                <option value="fail">Failed</option>
              </select>
              <select
                value={filterSort}
                onChange={(e) => setFilterSort(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-2)",
                  color: "var(--text-1)",
                  fontSize: "0.85rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="high_marks">Highest Marks</option>
                <option value="low_marks">Lowest Marks</option>
              </select>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredResults.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-3)",
                  fontSize: "0.875rem",
                }}
              >
                No submissions match your filters
              </div>
            ) : (
              <AnimatePresence>
                {filteredResults.map((r, idx) => (
                  <motion.div
                    key={r.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.875rem 1.25rem",
                      borderBottom:
                        idx < filteredResults.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      background:
                        idx % 2 === 0 ? "transparent" : "var(--bg-hover)",
                      transition: "background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          flexShrink: 0,
                          background: r.passed
                            ? "var(--green-bg)"
                            : "var(--red-bg)",
                          color: r.passed ? "var(--green)" : "var(--red)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          border: `1px solid ${r.passed ? "var(--green-border)" : "var(--red-border)"}`,
                        }}
                      >
                        {r.passed ? (
                          <Check size={18} strokeWidth={3} />
                        ) : (
                          <X size={18} strokeWidth={3} />
                        )}
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "var(--text-1)",
                            }}
                          >
                            {r.name || "Unknown Student"}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              color: "var(--text-3)",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {r.regNumber}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-3)",
                              fontFamily: "JetBrains Mono, monospace",
                              textTransform: "uppercase",
                            }}
                          >
                            {r.language}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-3)",
                            }}
                          >
                            •
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-3)",
                            }}
                          >
                            {new Date(r.submittedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "0.25rem",
                      }}
                    >
                      <span className={`badge badge-${r.difficulty}`}>
                        {DIFF_LABELS[r.difficulty] || r.difficulty}
                      </span>
                      <span
                        style={{
                          fontWeight: 900,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "1rem",
                          color: r.passed ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {r.score}
                        <span
                          style={{
                            fontSize: "0.6rem",
                            color: "var(--text-3)",
                            fontWeight: 500,
                          }}
                        >
                          /100
                        </span>
                      </span>
                      <button
                        onClick={(e) =>
                          handleDownloadPDF(e, r.id, r.language, r.difficulty)
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent)",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          marginTop: "0.2rem",
                          fontWeight: 600,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.textDecoration = "underline")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.textDecoration = "none")
                        }
                      >
                        <FileText size={12} /> Download PDF
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* Attendees Modal */}
      <AnimatePresence>
        {selectedBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
            }}
            onClick={() => setSelectedBox(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass"
              style={{
                width: "100%",
                maxWidth: 800,
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                padding: 0,
                overflow: "hidden",
                boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${DIFF_COLORS[selectedBox]}`,
              }}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-2)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "1.25rem",
                  }}
                >
                  <span className={`badge badge-${selectedBox}`}>
                    {DIFF_LABELS[selectedBox]}
                  </span>
                  Exam Attendees
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 500 }}>
                    — {results.filter(r => r.difficulty === selectedBox).length} total
                  </span>
                </h2>
                <button
                  onClick={() => setSelectedBox(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-3)",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-3)";
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  padding: "0.75rem 1.5rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  gap: "1.5rem",
                  background: "var(--bg-2)",
                  flexWrap: "wrap",
                }}
              >
                {["all", "pass", "fail"].map(status => {
                  const count = status === "all"
                    ? results.filter(r => r.difficulty === selectedBox).length
                    : status === "pass"
                    ? results.filter(r => r.difficulty === selectedBox && r.passed).length
                    : results.filter(r => r.difficulty === selectedBox && !r.passed).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setModalPassFilter(status)}
                      style={{
                        background: modalPassFilter === status ? (status === 'pass' ? 'var(--green-bg)' : status === 'fail' ? 'var(--red-bg)' : 'var(--bg-3)') : 'transparent',
                        border: `1px solid ${modalPassFilter === status ? (status === 'pass' ? 'var(--green-border)' : status === 'fail' ? 'var(--red-border)' : 'var(--border)') : 'transparent'}`,
                        borderRadius: 8, cursor: 'pointer',
                        color: status === 'pass' ? 'var(--green)' : status === 'fail' ? 'var(--red)' : 'var(--text-1)',
                        fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.75rem',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}
                    >
                      {status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⊙'}
                      {status === 'all' ? 'All' : status === 'pass' ? 'Passed' : 'Failed'}
                      <span style={{ background: 'var(--bg-1)', borderRadius: 12, padding: '0 6px', fontSize: '0.7rem' }}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  padding: "0.75rem 1.5rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  gap: "0.75rem",
                  background: "var(--bg-1)",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  placeholder="Search student or reg no..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    color: "var(--text-1)",
                    fontSize: "0.85rem",
                    flex: "1 1 200px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = DIFF_COLORS[selectedBox])
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <select
                  value={modalSort}
                  onChange={(e) => setModalSort(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    color: "var(--text-1)",
                    fontSize: "0.85rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="high_marks">Highest Marks</option>
                  <option value="low_marks">Lowest Marks</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                {(() => {
                  const modalResults = results
                    .filter((r) => {
                      if (r.difficulty !== selectedBox) return false;
                      if (modalPassFilter === "pass" && !r.passed) return false;
                      if (modalPassFilter === "fail" && r.passed) return false;
                      if (modalSearch) {
                        const q = modalSearch.toLowerCase();
                        if (
                          !r.name?.toLowerCase().includes(q) &&
                          !r.regNumber?.toLowerCase().includes(q)
                        )
                          return false;
                      }
                      return true;
                    })
                    .sort((a, b) => {
                      if (modalSort === "newest")
                        return (
                          new Date(b.submittedAt).getTime() -
                          new Date(a.submittedAt).getTime()
                        );
                      if (modalSort === "high_marks") return b.score - a.score;
                      if (modalSort === "low_marks") return a.score - b.score;
                      return 0;
                    });

                  if (modalResults.length === 0) {
                    return (
                      <div
                        style={{
                          padding: "4rem",
                          textAlign: "center",
                          color: "var(--text-3)",
                        }}
                      >
                        No attendees match your filters.
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      style={{ display: "flex", flexDirection: "column" }}
                      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                      initial="hidden"
                      animate="visible"
                    >
                      {modalResults.map((r, idx) => (
                        <motion.div
                          key={r.id || idx}
                          variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "1rem 1.5rem",
                            borderBottom:
                              idx < modalResults.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                            background:
                              idx % 2 === 0 ? "transparent" : "var(--bg-hover)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "1rem",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                flexShrink: 0,
                                background: r.passed
                                  ? "var(--green-bg)"
                                  : "var(--red-bg)",
                                color: r.passed ? "var(--green)" : "var(--red)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                border: `1px solid ${r.passed ? "var(--green-border)" : "var(--red-border)"}`,
                              }}
                            >
                              {r.passed ? (
                                <Check size={20} strokeWidth={3} />
                              ) : (
                                <X size={20} strokeWidth={3} />
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: "1rem",
                                  color: "var(--text-1)",
                                  marginBottom: 2,
                                }}
                              >
                                {r.name || "Unknown Student"}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.75rem",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    color: "var(--text-3)",
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  {r.regNumber}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-3)",
                                  }}
                                >
                                  •
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-3)",
                                  }}
                                >
                                  {r.department}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "0.25rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-3)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                fontWeight: 600,
                              }}
                            >
                              Score
                            </span>
                            <span
                              style={{
                                fontWeight: 900,
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: "1.25rem",
                                color: r.passed ? "var(--green)" : "var(--red)",
                                lineHeight: 1,
                              }}
                            >
                              {r.score}
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-3)",
                                  fontWeight: 600,
                                }}
                              >
                                /100
                              </span>
                            </span>
                            <button
                              onClick={(e) =>
                                handleDownloadPDF(
                                  e,
                                  r.id,
                                  r.language,
                                  r.difficulty,
                                )
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--accent)",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                marginTop: "0.25rem",
                                fontWeight: 600,
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.2rem",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.textDecoration =
                                  "underline")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.textDecoration = "none")
                              }
                            >
                              <FileText size={12} /> PDF
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
