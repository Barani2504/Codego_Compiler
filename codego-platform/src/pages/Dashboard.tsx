import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import axios from 'axios';
import { Terminal, Coffee, Settings, Wrench, Zap, Hand, BarChart, GraduationCap, Target, CheckCircle, TrendingUp, Flame, Circle, AlertTriangle, Rocket } from 'lucide-react';

const LANGUAGES = [
  { id: 'python',     label: 'Python',     icon: <Terminal size={24} />, color: '#3b82f6', desc: 'v3.11' },
  { id: 'java',       label: 'Java',       icon: <Coffee size={24} />, color: '#f59e0b', desc: 'v17' },
  { id: 'cpp',        label: 'C++',        icon: <Settings size={24} />, color: '#8b5cf6', desc: 'C++17' },
  { id: 'c',          label: 'C',          icon: <Wrench size={24} />, color: '#6b7280', desc: 'C99' },
  { id: 'javascript', label: 'JavaScript', icon: <Zap size={24} />, color: '#eab308', desc: 'ES2022' },
];

const DIFFICULTIES = [
  {
    id: 'easy', label: 'Foundational', color: '#3fb950', bg: 'rgba(63,185,80,0.08)', border: 'rgba(63,185,80,0.2)',
    icon: <Circle size={8} fill="currentColor" />, time: '~15 min',
    desc: 'Core logic, data handling and implementation tasks.',
  },
  {
    id: 'medium', label: 'Intermediate', color: '#d29922', bg: 'rgba(210,153,34,0.08)', border: 'rgba(210,153,34,0.2)',
    icon: <Circle size={8} fill="currentColor" />, time: '~30 min',
    desc: 'Algorithms, search/sort, and efficient data structures.',
  },
  {
    id: 'hard', label: 'Advanced', color: '#f85149', bg: 'rgba(248,81,73,0.08)', border: 'rgba(248,81,73,0.2)',
    icon: <Circle size={8} fill="currentColor" />, time: '~45 min',
    desc: 'Complex optimization, dynamic programming & advanced algorithms.',
  },
];

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 28 } },
};

export default function Dashboard() {
  const rawUser = localStorage.getItem('user');
  let user: any = {};
  try { user = rawUser ? JSON.parse(rawUser) : {}; } catch { user = {}; }

  const [lang, setLang] = useState('');
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!lang || !diff) return;
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      if (token?.startsWith('demo-')) {
        const mockQuestion = {
          id: 'mock-q-001',
          problemStatement: `Write a function that takes an array of integers and a target value. Return the indices of the two numbers that add up to the target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.`,
          constraints: '2 ≤ nums.length ≤ 10000, -10^9 ≤ nums[i] ≤ 10^9, Only one valid answer exists',
          sampleInput: 'nums = [2, 7, 11, 15], target = 9',
          sampleOutput: '[0, 1]',
          timeLimitMinutes: diff === 'easy' ? 15 : diff === 'medium' ? 30 : 45,
          language: lang, difficulty: diff,
        };
        navigate('/assessment', { state: { question: mockQuestion, language: lang, difficulty: diff } });
        return;
      }
      const res = await axios.post('/api/questions/generate', { language: lang, difficulty: diff }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/assessment', { state: { question: res.data, language: lang, difficulty: diff } });
    } catch {
      setError('Failed to generate question. Please try again.');
      setLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const canStart = lang && diff && !loading;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', position: 'relative', zIndex: 10 }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="flex-between"
        style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.2rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {greeting},
          </div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{user.name?.split(' ')[0] || user.regNumber || 'Student'} <Hand size={28} color="var(--yellow)" /></h1>
          {user.regNumber && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-3)' }}>
              {user.regNumber} · {user.department || 'CS'} · Year {user.year || '—'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Link to="/profile">
            <motion.span whileHover={{ scale: 1.04 }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BarChart size={16} /> Progress</motion.span>
          </Link>
          {(user.role === 'faculty' || user.role === 'admin') && (
            <Link to="/faculty">
              <motion.span whileHover={{ scale: 1.04 }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><GraduationCap size={16} /> Faculty</motion.span>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { icon: <Target size={24} />, label: 'Assessments', value: user.totalAssessments ?? '—', color: 'var(--accent)' },
          { icon: <CheckCircle size={24} />, label: 'Passed',       value: user.totalPassed ?? '—',       color: 'var(--green)' },
          { icon: <TrendingUp size={24} />, label: 'Avg Score',    value: user.averageScore ? `${Math.round(user.averageScore)}%` : '—', color: 'var(--neon-amber)' },
          { icon: <Flame size={24} />, label: 'Streak',       value: user.currentStreak != null ? `${user.currentStreak}d` : '—', color: 'var(--red)' },
        ].map(s => (
          <motion.div key={s.label} variants={item}>
            <Tilt tiltMaxAngleX={7} tiltMaxAngleY={7} scale={1.02} transitionSpeed={500} style={{ height: '100%' }}>
              <div className="stat-card">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.375rem' }}>{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </Tilt>
          </motion.div>
        ))}
      </motion.div>

      {/* Assessment configurator */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.12 }}
        className="card-glass"
        style={{ padding: '2rem' }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.35rem' }}>Start New Assessment</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
            AI generates a unique, professional-grade question. Every attempt is distinct.
          </p>
        </div>

        {/* Step 1 — Language */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: lang ? 'var(--accent)' : 'var(--bg-3)',
              border: `2px solid ${lang ? 'var(--accent)' : 'var(--border-mid)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.68rem', fontWeight: 800,
              color: lang ? '#fff' : 'var(--text-3)',
              transition: 'all 0.25s',
              flexShrink: 0,
            }}>1</div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Choose Language</h3>
          </div>

          <motion.div variants={stagger} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.625rem' }}>
            {LANGUAGES.map(l => (
              <motion.div key={l.id} variants={item}>
                <motion.button
                  id={`lang-${l.id}`}
                  onClick={() => setLang(l.id)}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.03 }}
                  style={{
                    width: '100%', padding: '0.875rem 0.5rem',
                    background: lang === l.id ? `${l.color}14` : 'var(--bg-card)',
                    border: `1px solid ${lang === l.id ? l.color : 'var(--border)'}`,
                    borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                    boxShadow: lang === l.id ? `0 0 0 1px ${l.color}30, 0 4px 16px ${l.color}20` : 'var(--card-shadow)',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{l.icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: lang === l.id ? l.color : 'var(--text-1)' }}>{l.label}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 500 }}>{l.desc}</span>
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Step 2 — Difficulty */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: diff ? 'var(--accent)' : 'var(--bg-3)',
              border: `2px solid ${diff ? 'var(--accent)' : 'var(--border-mid)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.68rem', fontWeight: 800,
              color: diff ? '#fff' : 'var(--text-3)',
              transition: 'all 0.25s', flexShrink: 0,
            }}>2</div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Choose Difficulty</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
            {DIFFICULTIES.map(d => (
              <motion.button
                key={d.id}
                id={`diff-${d.id}`}
                onClick={() => setDiff(d.id)}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                style={{
                  padding: '1.125rem 1.25rem', textAlign: 'left',
                  background: diff === d.id ? d.bg : 'var(--bg-card)',
                  border: `1px solid ${diff === d.id ? d.border : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.2s ease',
                  boxShadow: diff === d.id ? `0 0 0 1px ${d.border}, 0 4px 20px ${d.bg}` : 'var(--card-shadow)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: d.color, display: 'flex', alignItems: 'center' }}>{d.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: diff === d.id ? d.color : 'var(--text-1)' }}>{d.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 500 }}>{d.time}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{d.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            ><AlertTriangle size={16} /> {error}</motion.div>
          )}
        </AnimatePresence>

        <motion.button
          id="startAssessmentBtn"
          onClick={handleStart}
          disabled={!canStart}
          className="btn btn-primary btn-xl"
          whileHover={canStart ? { scale: 1.01 } : {}}
          whileTap={canStart ? { scale: 0.99 } : {}}
          style={{ fontSize: '0.95rem', fontWeight: 700 }}
        >
          {loading
            ? <><div className="spinner" /> AI is generating your question...</>
            : (!lang || !diff)
              ? 'Select language and difficulty above'
              : <><Rocket size={18} /> Start {DIFFICULTIES.find(d => d.id === diff)?.label} {LANGUAGES.find(l => l.id === lang)?.label} Assessment</>
          }
        </motion.button>
      </motion.div>
    </div>
  );
}
