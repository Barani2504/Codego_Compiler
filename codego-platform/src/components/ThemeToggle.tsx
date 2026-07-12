import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 60, height: 30,
        borderRadius: 99,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(31,35,40,0.15)'}`,
        background: isDark
          ? 'rgba(129,140,248,0.12)'
          : 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        boxShadow: isDark
          ? 'inset 0 1px 3px rgba(0,0,0,0.4), 0 0 10px rgba(129,140,248,0.2)'
          : 'inset 0 1px 3px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.06)',
        transition: 'all 0.25s ease',
        flexShrink: 0,
      }}
    >
      {/* Track icons */}
      <span style={{
        position: 'absolute', left: 7, fontSize: 10,
        opacity: isDark ? 0.7 : 0,
        transition: 'opacity 0.2s',
        pointerEvents: 'none',
      }}>🌙</span>
      <span style={{
        position: 'absolute', right: 7, fontSize: 10,
        opacity: isDark ? 0 : 0.7,
        transition: 'opacity 0.2s',
        pointerEvents: 'none',
      }}>☀️</span>

      {/* Thumb */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(135deg, #818cf8, #a78bfa)'
            : 'linear-gradient(135deg, #f59e0b, #f97316)',
          boxShadow: isDark
            ? '0 0 10px rgba(129,140,248,0.6), 0 2px 4px rgba(0,0,0,0.3)'
            : '0 0 10px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.1)',
          marginLeft: isDark ? 0 : 'auto',
        }}
      />
    </motion.button>
  );
}
