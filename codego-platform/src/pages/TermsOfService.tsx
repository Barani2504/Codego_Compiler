import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { FileCheck, ArrowLeft, Scale, ShieldAlert, Mail, MapPin, Phone } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function TermsOfService() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Terms of Service',
    description: 'CodeGo Terms of Service governing platform usage, academic integrity codes, and institutional assessment standards.',
  });

  return (
    <div style={{ minHeight: '100vh', padding: '3rem 1.5rem', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-bright)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)', marginBottom: '0.75rem' }}>
            <Scale size={24} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Academic Terms
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--text-1)', marginBottom: '0.5rem' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>
            Effective Date: September 1, 2026 · Last Updated: September 4, 2026 · Version 3.1
          </p>
        </motion.div>

        {/* Terms Content */}
        <div
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '2.5rem',
            color: 'var(--text-1)',
            lineHeight: 1.8,
            fontSize: '0.95rem',
          }}
        >
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              1. Acceptance & Academic Integrity Code
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              By logging into CodeGo, candidates agree to abide by the university&apos;s Honor Code and these Terms. All submitted code must be authored solely by the student without unauthorized human or external AI proxy assistance, except where explicitly permitted by the course instructor.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              2. Prohibited Sandbox Conduct
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              Our sandboxed compilers run inside isolated micro-containers. Candidates and users agree NOT to:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Attempt container breakout, kernel exploit execution, or unauthorized file system traversal.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Launch denial-of-service attempts, infinite fork bombs, or crypto-mining scripts.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Circumvent proctoring mechanisms, screen capture safeguards, or focus-state telemetry.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              3. Compiler Allocation & Execution Limits
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              Compilation runs are subject to automatic CPU, wall-clock time (default 5.0 seconds), and memory caps (default 256MB). Submissions exceeding allocated thresholds will trigger standard <code>Time Limit Exceeded (TLE)</code> or <code>Memory Limit Exceeded (MLE)</code> statuses.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              4. Intellectual Property Rights
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              Assessment prompts, proprietary test suites, and grading heuristics are the exclusive intellectual property of CodeGo or the licensing institution. Candidates retain copyright to their original authored answers, granting the institution a limited license to evaluate, archive, and audit said answers.
            </p>
          </section>

          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              5. Institutional Inquiries & Administration
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              For institutional master licensing or terms disputes, contact:
            </p>
            <div style={{ background: 'var(--bg-3)', borderRadius: '12px', padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-2)' }}>
                <MapPin size={18} style={{ color: 'var(--accent)' }} />
                <span>CodeGo Technologies · 3215 Porter Dr, Palo Alto, CA 94304</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-2)' }}>
                <Mail size={18} style={{ color: 'var(--accent)' }} />
                <span>legal@codego.dev · support@codego.dev</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-2)' }}>
                <Phone size={18} style={{ color: 'var(--accent)' }} />
                <span>+1 (800) 555-CODE (2633)</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Privacy Policy →
          </Link>
          <Link to="/" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
