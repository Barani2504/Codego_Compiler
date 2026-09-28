import { motion } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Award, LayoutDashboard, ArrowRight, ShieldCheck, Download, Home } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTheme } from '../context/ThemeContext';

export default function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  usePageMeta({
    title: 'Submission Received — Thank You',
    description: 'Your code submission and assessment telemetry have been successfully received and cataloged by CodeGo.',
  });

  const state = (location.state as any) || {};
  const submissionId = state.submissionId || 'SUB-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const title = state.assessmentTitle || 'Institutional Coding Evaluation';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          maxWidth: '620px',
          width: '100%',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--border-bright)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: 'var(--card-shadow)',
          textAlign: 'center',
        }}
      >
        {/* Animated Checkmark Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))',
            border: '2px solid rgba(74, 222, 128, 0.4)',
            color: '#4ade80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 30px rgba(74, 222, 128, 0.25)',
          }}
        >
          <CheckCircle2 size={44} />
        </motion.div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(74, 222, 128, 0.1)',
            color: '#4ade80',
            border: '1px solid rgba(74, 222, 128, 0.25)',
            marginBottom: '1rem',
          }}
        >
          <ShieldCheck size={14} /> Submission Sealed & Recorded
        </span>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            color: 'var(--text-1)',
            marginBottom: '0.75rem',
          }}
        >
          Thank You! Assessment Completed
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-2)',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Your assessment run for <strong>{title}</strong> has been received by the evaluation cluster. Test cases have been verified and full runtime metrics recorded.
        </p>

        {/* Receipt Box */}
        <div
          style={{
            background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-3)' }}>Reference Hash:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--accent)' }}>
              {submissionId}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-3)' }}>Status:</span>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>Archived for Grading</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-3)' }}>Timestamp:</span>
            <span style={{ color: 'var(--text-2)' }}>{new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary btn-md"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LayoutDashboard size={16} /> Return to Dashboard
          </button>
          <button
            onClick={() => navigate('/results')}
            className="btn btn-ghost btn-md"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Award size={16} /> View Performance Report
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
          Need assistance or notice an error?{' '}
          <a href="mailto:support@codego.dev" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Contact Institutional Support
          </a>
        </div>
      </motion.div>
    </div>
  );
}
