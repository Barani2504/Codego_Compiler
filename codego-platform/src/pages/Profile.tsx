import { useEffect, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import type { ErrorInfo, ReactNode } from 'react';
import { Target, CheckCircle, TrendingUp, Trophy, Flame, Star, Zap, Terminal, Coffee, Settings, Wrench, Clock, Check, X, AlertTriangle } from 'lucide-react';

class ProfileErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Profile Crash:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--red)' }}><AlertTriangle size={48} /></div>
        <h2>Analytics Unavailable</h2>
        <p style={{ color: 'var(--text-3)', marginBottom: '2rem' }}>Encountered an error loading your profile stats. Please refresh.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
    return this.props.children;
  }
}

const DEMO_DATA = {
  student: { name: 'Arun Kumar', regNumber: '21CS001', department: 'CS', year: 3, totalAssessments: 18, totalPassed: 14, averageScore: 76.4, passRate: 78, currentStreak: 5, longestStreak: 12 },
  byDifficulty: [
    { difficulty: 'easy',   total: '8', passed: '8', avgScore: '88.5' },
    { difficulty: 'medium', total: '7', passed: '5', avgScore: '72.3' },
    { difficulty: 'hard',   total: '3', passed: '1', avgScore: '55.0' },
  ],
  byLanguage: [
    { language: 'python',     total: '8', avgScore: '80.2' },
    { language: 'java',       total: '4', avgScore: '70.1' },
    { language: 'cpp',        total: '3', avgScore: '65.3' },
    { language: 'javascript', total: '3', avgScore: '84.5' },
  ],
  scoreTrend: [
    { score: 65, date: '2026-04-01' }, { score: 72, date: '2026-04-05' },
    { score: 58, date: '2026-04-08' }, { score: 80, date: '2026-04-12' },
    { score: 91, date: '2026-04-15' }, { score: 45, date: '2026-04-18' },
    { score: 88, date: '2026-04-22' }, { score: 76, date: '2026-04-25' },
    { score: 94, date: '2026-04-27' }, { score: 82, date: '2026-04-28' },
  ],
  recentSubmissions: [
    { id: 's1', language: 'python',     difficulty: 'hard',   score: 82, passed: true,  submittedAt: '2026-04-28T10:30:00' },
    { id: 's2', language: 'javascript', difficulty: 'easy',   score: 94, passed: true,  submittedAt: '2026-04-27T14:15:00' },
    { id: 's3', language: 'cpp',        difficulty: 'medium', score: 76, passed: true,  submittedAt: '2026-04-25T09:20:00' },
    { id: 's4', language: 'python',     difficulty: 'medium', score: 88, passed: true,  submittedAt: '2026-04-22T16:45:00' },
    { id: 's5', language: 'java',       difficulty: 'hard',   score: 45, passed: false, submittedAt: '2026-04-18T11:30:00' },
  ],
};

const DIFF_LABELS: Record<string, string> = { easy: 'Foundational', medium: 'Intermediate', hard: 'Advanced' };
const DIFF_COLOR:  Record<string, string> = { easy: 'var(--green)', medium: 'var(--yellow)', hard: 'var(--red)' };
const LANG_ICONS:  Record<string, ReactNode> = { python: <Terminal size={18} />, java: <Coffee size={18} />, cpp: <Settings size={18} />, javascript: <Zap size={18} />, c: <Wrench size={18} /> };

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 28 } } };

export default function Profile() {
  return <ProfileErrorBoundary><ProfileContent /></ProfileErrorBoundary>;
}

function ProfileContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  const { isDark } = useTheme();

  const fetchProfile = () => {
    setLoading(true);
    setApiError(false);
    setBackendOffline(false);
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-')) {
      setTimeout(() => { setData(DEMO_DATA); setLoading(false); }, 600);
      return;
    }
    axios.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch((err) => {
        const status = err?.response?.status;
        const isOffline =
          // Vite proxy returns 503 with { offline: true } when backend is down
          status === 503 ||
          // Direct network error (no proxy, e.g. Electron/production)
          err?.code === 'ECONNREFUSED' ||
          err?.code === 'ERR_NETWORK' ||
          err?.message === 'Network Error';

        if (isOffline) {
          setBackendOffline(true); // soft notice — backend simply not started
        } else {
          setApiError(true);       // real API error (500, 401, etc.)
        }
        setData(DEMO_DATA);
        setLoading(false);
      });
  };

  useEffect(() => { fetchProfile(); }, []);

  if (loading) return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 96, borderRadius: 12 }} />)}
      </div>
      {[280, 220].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: '1rem' }} />)}
    </div>
  );

  if (!data?.student) return (
    <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-3)', marginBottom: '1.25rem' }}>No profile data found. Complete an assessment to see your stats!</p>
      <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
    </div>
  );

  const { student, byDifficulty, byLanguage, recentSubmissions, scoreTrend } = data;

  const tooltipStyle = {
    background: isDark ? 'rgba(13,17,23,0.95)' : 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-1)', fontSize: '0.82rem',
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', position: 'relative', zIndex: 10 }}>

      {/* Backend offline — soft info notice */}
      {backendOffline && (
        <div
          style={{
            background: isDark ? 'rgba(99,102,241,0.07)' : 'rgba(79,70,229,0.05)',
            border: '1px solid rgba(129,140,248,0.25)',
            borderRadius: 10, padding: '0.65rem 1.25rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem' }}>
            <Clock size={15} />
            <span>Backend is offline — showing demo stats. Start the backend to see your real data.</span>
          </div>
          <button
            onClick={fetchProfile}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: 0.9 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* API error banner — real backend error (500, auth failure, etc.) */}
      {apiError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '0.75rem 1.25rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--red)', fontSize: '0.875rem', fontWeight: 600 }}>
            <AlertTriangle size={16} />
            Could not load your profile data — showing demo stats. Check your connection.
          </div>
          <button
            onClick={fetchProfile}
            style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>My Progress</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-3)', fontSize: '0.82rem' }}>Full assessment history and analytics</p>
        </div>
        <Link to="/dashboard">
          <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap size={16} /> New Assessment
          </motion.span>
        </Link>
      </motion.div>

      {/* Student banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))'
            : 'linear-gradient(135deg, rgba(79,70,229,0.07), rgba(124,58,237,0.04))',
          border: '1px solid rgba(129,140,248,0.18)',
          borderRadius: 14, padding: '1.375rem 1.75rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
        }}
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: 4 }}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 900, color: '#fff', flexShrink: 0,
            boxShadow: '0 6px 20px var(--accent-glow)',
          }}
        >
          {student.name?.[0] || '?'}
        </motion.div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{student.name}</h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-3)', fontSize: '0.82rem' }}>
            {student.regNumber} · {student.department} · Year {student.year}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--neon-amber)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={20} /> {student.currentStreak}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Streak</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={20} /> {student.longestStreak}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Streak</div>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Taken', value: student.totalAssessments, color: 'var(--accent)',    icon: <Target size={24} /> },
          { label: 'Total Passed', value: student.totalPassed,     color: 'var(--green)',     icon: <CheckCircle size={24} /> },
          { label: 'Avg Score',   value: `${Math.round(student.averageScore)}%`, color: 'var(--neon-amber)', icon: <TrendingUp size={24} /> },
          { label: 'Pass Rate',   value: `${student.passRate}%`,   color: 'var(--neon-cyan)', icon: <Trophy size={24} /> },
        ].map(s => (
          <motion.div key={s.label} variants={item}>
            <Tilt tiltMaxAngleX={7} tiltMaxAngleY={7} scale={1.03} transitionSpeed={500}>
              <div className="stat-card">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.375rem' }}>{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </Tilt>
          </motion.div>
        ))}
      </motion.div>

      {/* Score trend */}
      {scoreTrend?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card-glass" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> Score Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}/100`, 'Score']} />
              <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5}
                fill="url(#scoreGrad)"
                dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'var(--accent-2)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* By difficulty */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card-glass">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>Performance by Difficulty</h3>
          {['easy', 'medium', 'hard'].map(d => {
            const stat = byDifficulty?.find((b: any) => b.difficulty === d) || {};
            const total = parseInt(stat.total || '0');
            const passed = parseInt(stat.passed || '0');
            const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
            return (
              <div key={d} style={{ marginBottom: '1.25rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${d}`}>{DIFF_LABELS[d]}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {passed}/{total} · {stat.avgScore ? Math.round(parseFloat(stat.avgScore)) : '—'}%
                  </span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    style={{ height: '100%', borderRadius: 99, background: DIFF_COLOR[d] }}
                  />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* By language */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card-glass">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>Performance by Language</h3>
          {byLanguage?.slice(0, 5).map((l: any) => {
            const score = Math.round(parseFloat(l.avgScore || '0'));
            const barWidth = `${score}%`;
            return (
              <div key={l.language} style={{ marginBottom: '0.875rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', display: 'flex', alignItems: 'center' }}>{LANG_ICONS[l.language] || <Terminal size={18} />}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'var(--text-1)' }}>
                      {l.language}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{l.total}x</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    {score}%
                  </span>
                </div>
                <div className="progress-bar">
                  <motion.div initial={{ width: 0 }} animate={{ width: barWidth }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.55 }}
                    style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                  />
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Recent submissions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card-glass" style={{ padding: 0, overflow: 'hidden' }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} /> Recent Submissions</h3>
        </div>
        {recentSubmissions?.map((s: any, i: number) => (
          <motion.div key={s.id}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.05 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              borderBottom: i < recentSubmissions.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: s.passed ? 'var(--green-bg)' : 'var(--red-bg)',
                border: `1px solid ${s.passed ? 'var(--green-border)' : 'var(--red-border)'}`,
                color: s.passed ? 'var(--green)' : 'var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.passed ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
              </div>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem', alignItems: 'center' }}>
                  <span className={`badge badge-${s.difficulty}`}>{DIFF_LABELS[s.difficulty]}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    {s.language}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                  {new Date(s.submittedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
            <div style={{
              fontWeight: 900, fontSize: '1.2rem',
              color: s.passed ? 'var(--green)' : 'var(--red)',
              fontFamily: "'Outfit', sans-serif",
            }}>
              {s.score}<span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 500, fontFamily: 'inherit' }}>/100</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
