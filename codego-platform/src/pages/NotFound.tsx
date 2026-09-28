import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, ArrowLeft, Terminal, AlertTriangle, Shield, FileText } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTheme } from '../context/ThemeContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  usePageMeta({
    title: '404 - Page Not Found',
    description: 'The requested resource or assessment route could not be found on CodeGo.',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--border-bright)',
          borderRadius: '24px',
          padding: '3rem 2rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Glowing 404 Badge */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            style={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(129, 140, 248, 0.15))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              color: '#f87171',
            }}
          >
            <Compass size={40} />
          </motion.div>
        </div>

        {/* Big Glitch 404 Text */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '4.5rem',
            fontWeight: 800,
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #f87171 0%, #818cf8 50%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: 'var(--text-1)',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Execution Route Not Found
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-2)',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          The page or evaluation endpoint you are attempting to reach does not exist or has been decommissioned. Check the address or jump back into your session.
        </p>

        {/* Code Snippet Box */}
        <div
          style={{
            background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8rem',
            color: 'var(--text-code)',
            textAlign: 'left',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <Terminal size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span>Error 404: HTTP_ROUTE_UNDEFINED in CodeGo Router</span>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary btn-md"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Home size={16} /> Return Home
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-md"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LayoutDashboard size={16} /> Student Dashboard
          </button>
        </div>

        {/* Quick Links */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.25rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-3)',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/login" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link to="/privacy" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
            Terms of Service
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
