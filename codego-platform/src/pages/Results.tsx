import { Component, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AlertTriangle, Inbox, Download, ArrowRight, CheckCircle, XCircle, Beaker, BarChart, Bot, Lightbulb, Rocket, ChevronDown, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import axios from 'axios';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ResultsErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || 'Unknown error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="page-center">
          <div className="card-glass" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--yellow)' }}><AlertTriangle size={48} /></div>
            <h2 style={{ marginBottom: '0.5rem' }}>Results failed to render</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {this.state.error}
            </p>
            <Link to="/dashboard" className="btn btn-primary">← Back to Dashboard</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ResultsInner() {
  const { state } = useLocation();
  const { result, language, difficulty, submissionId } = state || {};

  if (!result) {
    return (
      <div className="page-center">
        <div className="card-glass" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-3)' }}><Inbox size={48} /></div>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>No result data found.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Safe defaults — guard every field the AI/backend might omit ──────────
  const score       = Number(result.score)       || 0;
  const testsPassed = Number(result.testsPassed) || 0;
  const testsTotal  = Number(result.testsTotal)  || 0;
  const passed      = Boolean(result.passed);
  const testDetails: any[] = Array.isArray(result.testDetails) ? result.testDetails : [];
  const aiFeedback  = result.aiFeedback || null;
  const passRate    = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
  const testScore   = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 60) : 0;
  const aiScore     = Number(aiFeedback?.qualityScore) || null; // null = not available

  const [expandedTc, setExpandedTc] = useState<number | null>(null);
  const [expandedAiBox, setExpandedAiBox] = useState<string | null>(null);

  useEffect(() => {
    if (passed) {
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3fb950', '#818cf8', '#ffffff'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#3fb950', '#818cf8', '#ffffff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [passed]);

  const downloadPDF = async () => {
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-')) { alert('PDF download is simulated in demo mode.'); return; }
    if (!submissionId) { alert('Submission ID not found. Cannot download PDF.'); return; }

    try {
      // Use axios to fetch the blob instead of window.open. 
      // This works cleanly in both Web and Electron without spawning a blank window.
      const res = await axios.get(`/api/results/${submissionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `result-${language || 'code'}-${difficulty || 'assessment'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF. Please try again later.');
    }
  };

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: 860, position: 'relative', zIndex: 10 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Assessment Result</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-3)', fontSize: '0.8rem' }}>
            {result.gradedAt ? new Date(result.gradedAt).toLocaleString() : new Date().toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} id="downloadPdfBtn" className="btn btn-secondary" onClick={downloadPDF}>
            <Download size={16} /> Download PDF
          </motion.button>
          <Link to="/dashboard">
            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Try Another <ArrowRight size={16} />
            </motion.span>
          </Link>
        </div>
      </motion.div>

      {/* Score banner */}
      <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} scale={1.01} transitionSpeed={800} glareEnable glareMaxOpacity={0.06}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            background: passed
              ? 'linear-gradient(135deg, rgba(63,185,80,0.1), rgba(63,185,80,0.04))'
              : 'linear-gradient(135deg, rgba(248,81,73,0.1), rgba(248,81,73,0.04))',
            border: `1px solid ${passed ? 'var(--green-border)' : 'var(--red-border)'}`,
            borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', textAlign: 'center',
            backdropFilter: 'blur(24px)',
          }}
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            style={{
              fontSize: 'clamp(3rem,10vw,5rem)', fontWeight: 900, lineHeight: 1,
              color: passed ? 'var(--green)' : 'var(--red)',
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.04em',
              marginBottom: '0.5rem',
            }}
          >
            {score}<span style={{ fontSize: '35%', color: 'var(--text-3)', fontWeight: 500 }}>/100</span>
          </motion.div>
          <motion.div
            animate={!passed ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4, delay: 0.6 }}
            style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.875rem', color: passed ? 'var(--green)' : 'var(--red)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {passed ? <><CheckCircle size={20} /> PASSED</> : <><XCircle size={20} /> NOT PASSED</>}
          </motion.div>
          {!passed && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              style={{ fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.625rem 1rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Rocket size={16} color="var(--accent)" /> Every expert was once a beginner. Keep practicing, you've got this! 
            </motion.div>
          )}
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <span className={`badge badge-${difficulty || 'easy'}`}>{(difficulty || 'N/A').toUpperCase()}</span>
            <span className="badge badge-info">{(language || 'N/A').toUpperCase()}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}><Beaker size={14} /> {testsPassed}/{testsTotal}</span>
          </div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <div className="progress-bar">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${Math.min(100, score)}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                style={{ height: '100%', borderRadius: 99, background: passed ? 'linear-gradient(90deg, var(--green), #16a34a)' : 'linear-gradient(90deg, var(--red), #dc2626)' }}
              />
            </div>
          </div>
        </motion.div>
      </Tilt>

      {/* Score breakdown */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: <Beaker size={24} />, label: 'TEST CASE SCORE', value: `${testScore}`, sub: '/60', color: 'var(--blue)' },
          { icon: <BarChart size={24} />, label: 'PASS RATE', value: `${passRate}%`, sub: ` (${testsPassed}/${testsTotal})`, color: passRate === 100 ? 'var(--green)' : passRate >= 60 ? 'var(--yellow)' : 'var(--red)' },
          ...(aiScore !== null ? [
            { icon: <Bot size={24} />, label: 'AI QUALITY SCORE', value: `${aiScore}`, sub: '/40', color: 'var(--accent-2)' }
          ] : []),
        ].map(s => (
          <motion.div key={s.label} variants={item}>
            <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} scale={1.02} transitionSpeed={500}>
              <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-glow)', flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>
                    {s.value}<span style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.sub}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em' }}>{s.label}</div>
                </div>
              </div>
            </Tilt>
          </motion.div>
        ))}
      </motion.div>

      {/* Test cases */}
      <motion.div variants={container} initial="hidden" animate="visible"
        className="card-glass" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={18} /> Test Cases</h3>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green)' }}>{testsPassed} passed</span>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{testsTotal}</span>
            <div style={{ width: 56, marginLeft: '0.5rem' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${passRate}%`, background: passRate === 100 ? 'var(--green)' : passRate >= 60 ? 'var(--yellow)' : 'var(--red)' }} />
              </div>
            </div>
          </div>
        </div>
        {testDetails.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.9rem' }}>
            No test case details available.
          </div>
        ) : testDetails.map((tc: any, i: number) => {
          const isOpen = expandedTc === i;
          const tcPassed = tc?.passed;
          return (
            <div key={tc?.index ?? i} style={{ borderBottom: i < testDetails.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {/* Clickable header row */}
              <div
                onClick={() => setExpandedTc(isOpen ? null : i)}
                style={{
                  padding: '0.875rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  cursor: 'pointer',
                  background: tcPassed ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: tcPassed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${tcPassed ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tcPassed ? 'var(--green)' : 'var(--red)',
                }}>
                  {tcPassed ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem', color: tcPassed ? 'var(--green)' : 'var(--red)' }}>
                  Test Case {tc?.index ?? i + 1}
                </div>
                <div style={{ color: 'var(--text-3)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Expandable detail panel */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  style={{
                    padding: '0.875rem 1.25rem 1.25rem 1.25rem',
                    background: 'rgba(0,0,0,0.15)',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem',
                  }}
                >
                  {/* Input */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Input</div>
                    <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {tc?.input || '<none>'}
                    </pre>
                  </div>
                  {/* Expected */}
                  <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: 8, padding: '0.75rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Expected</div>
                    <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--green)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {tc?.expectedOutput || '<none>'}
                    </pre>
                  </div>
                  {/* Actual */}
                  <div style={{ background: tcPassed ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', borderRadius: 8, padding: '0.75rem', border: `1px solid ${tcPassed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: tcPassed ? 'var(--green)' : 'var(--red)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Your Output</div>
                    <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: tcPassed ? 'var(--green)' : 'var(--red)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {tc?.actualOutput || '<empty>'}
                    </pre>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* AI Feedback */}
      {aiFeedback && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 25, delay: 0.3 }}
          className="card-glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.05)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bot size={18} /> AI Code Review</h3>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
              {[
                { 
                  label: 'CODE QUALITY', 
                  value: aiFeedback.codeQuality || 'N/A', 
                  mono: false,
                  explanation: (function() {
                    const q = (aiFeedback.codeQuality || '').toLowerCase();
                    if (q.includes('perfect') || q.includes('excellent')) return 'Exceptional work! Your code is elegantly structured and follows professional industry standards.';
                    if (q.includes('good') || q.includes('great')) return 'Solid effort. Your logic is sound and the code is readable, though minor cleanups could be applied.';
                    if (q.includes('fair') || q.includes('average') || q.includes('needs')) return 'The code functions, but there is room for improvement in readability, naming, or structure.';
                    if (q.includes('poor') || q.includes('bad')) return 'The code structure needs significant revision. Focus on meaningful variable names and removing redundancy.';
                    return 'This metric evaluates your code style, naming conventions, and structural clarity.';
                  })()
                },
                { 
                  label: 'TIME COMPLEXITY', 
                  value: aiFeedback.timeComplexity || 'N/A', 
                  mono: true,
                  explanation: (function() {
                    const clean = (aiFeedback.timeComplexity || '').toLowerCase().replace(/\s+/g, '');
                    if (clean.includes('o(1)')) return 'O(1) Constant Time: Highly optimal. The execution time remains the same regardless of input size.';
                    if (clean.includes('o(logn)')) return 'O(log n) Logarithmic Time: Execution time grows slowly. Typical of divide-and-conquer algorithms.';
                    if (clean.includes('o(n)')) return 'O(n) Linear Time: Execution time grows proportionally to the input size. Typical of a single pass loop.';
                    if (clean.includes('o(nlogn)')) return 'O(n log n) Linearithmic Time: Standard for efficient sorting algorithms like Merge Sort.';
                    if (clean.includes('o(n^2)') || clean.includes('o(n*n)')) return 'O(n²) Quadratic Time: Execution time grows exponentially. Often caused by nested loops over the data.';
                    if (clean.includes('o(2^n)')) return 'O(2^n) Exponential Time: Extremely slow for large inputs. Typical of unoptimized recursion.';
                    return 'This describes how the execution time scales with larger input sizes (Big-O notation).';
                  })()
                },
              ].map(s => {
                const isExpanded = expandedAiBox === s.label;
                return (
                <motion.div 
                  key={s.label} 
                  layout
                  onClick={() => setExpandedAiBox(isExpanded ? null : s.label)}
                  style={{ 
                    background: isExpanded ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.1)', 
                    borderRadius: 10, padding: '0.875rem', 
                    border: `1px solid ${isExpanded ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`, 
                    backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all 0.2s' 
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(0,0,0,0.1)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: isExpanded ? 'var(--accent)' : 'var(--text-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', transition: 'color 0.2s' }}>{s.label}</div>
                      <div style={{ fontWeight: s.mono ? 800 : 600, color: s.mono ? 'var(--accent)' : 'var(--text-1)', fontFamily: s.mono ? 'JetBrains Mono, monospace' : 'inherit', fontSize: s.mono ? '1rem' : '0.9rem' }}>{s.value}</div>
                    </div>
                    <div style={{ color: isExpanded ? 'var(--accent)' : 'var(--text-3)', transition: 'transform 0.2s, color 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: '0.2rem' }}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ paddingTop: '0.75rem', borderTop: `1px solid ${isExpanded ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.1)'}`, fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                          {s.explanation}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                );
              })}
            </div>
            {aiFeedback.overallComment && (
              <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Overall Feedback</div>
                <p style={{ margin: 0, lineHeight: 1.75, color: 'var(--text-1)', fontSize: '0.875rem' }}>{aiFeedback.overallComment}</p>
              </div>
            )}
            {Array.isArray(aiFeedback.suggestions) && aiFeedback.suggestions.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lightbulb size={14} /> Suggestions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {aiFeedback.suggestions.map((s: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                      style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', background: 'rgba(0,0,0,0.1)', borderRadius: 8, padding: '0.75rem', backdropFilter: 'blur(8px)' }}>
                      <span style={{ color: 'var(--yellow)', flexShrink: 0, marginTop: 2 }}><ArrowRight size={14} /></span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{String(s)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <Link to="/dashboard" style={{ flex: 1 }}>
          <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-primary btn-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Rocket size={18} /> Try Another
          </motion.span>
        </Link>
        <Link to="/profile" style={{ flex: 1 }}>
          <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost btn-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <BarChart size={18} /> My Progress
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Exported wrapper with Error Boundary ─────────────────────────────────────
export default function Results() {
  return (
    <ResultsErrorBoundary>
      <ResultsInner />
    </ResultsErrorBoundary>
  );
}
