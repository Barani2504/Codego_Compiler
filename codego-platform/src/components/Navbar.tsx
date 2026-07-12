import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark } = useTheme();
  const rawUser = localStorage.getItem('user');
  let user: any = null;
  try { user = rawUser ? JSON.parse(rawUser) : null; } catch { user = null; }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = (user?.role === 'faculty' || user?.role === 'admin')
    ? [{ to: '/faculty', label: 'Faculty', icon: '🎓' }]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: '⚡' },
        { to: '/profile', label: 'Progress', icon: '📊' },
      ];

  const isActive = (p: string) => location.pathname === p;
  const initials = (user?.name?.[0] || user?.regNumber?.[0] || 'U').toUpperCase();

  return (
    <motion.nav
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 56,
        background: isDark
          ? 'rgba(13,17,23,0.85)'
          : 'rgba(246,248,250,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(31,35,40,0.1)'}`,
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      {/* Logo */}
      <Link
        to={user?.role === 'faculty' || user?.role === 'admin' ? '/faculty' : '/dashboard'}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: 8 }}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}
        >⚡</motion.div>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: '1rem',
          color: 'var(--text-1)',
          letterSpacing: '-0.03em',
        }}>
          Code<span style={{ color: 'var(--accent)' }}>Go</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }} className="hide-mobile">
        {navLinks.map(link => (
          <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.4rem 0.875rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: isActive(link.to) ? 600 : 500,
                color: isActive(link.to) ? 'var(--accent)' : 'var(--text-2)',
                background: isActive(link.to) ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${isActive(link.to) ? 'rgba(129,140,248,0.2)' : 'transparent'}`,
                transition: 'all 0.18s ease',
              }}
            >
              <span style={{ fontSize: '0.95rem' }}>{link.icon}</span>
              {link.label}
              {isActive(link.to) && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 8,
                    background: 'var(--accent-glow)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        <ThemeToggle />

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.625rem', borderLeft: '1px solid var(--border)' }}>
            {/* User pill */}
            <div
              className="hide-mobile"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.25rem 0.75rem 0.25rem 0.25rem',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                cursor: 'default',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, color: '#fff',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>
                  {user.name?.split(' ')[0] || user.regNumber}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 1 }}>
                  {user.role || 'Student'}
                </div>
              </div>
            </div>

            <Link to="/change-password">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="btn btn-ghost btn-sm"
                style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}
                title="Change Password"
              >🔑</motion.button>
            </Link>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '0.3rem 0.6rem',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 7,
                color: 'var(--red)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '0.85rem' }}>↩</span> Sign out
            </motion.button>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
