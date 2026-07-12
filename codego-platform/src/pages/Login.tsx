import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { Zap, AlertTriangle, EyeOff, Eye, ArrowRight, GraduationCap, Users } from 'lucide-react';

export default function Login() {
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/auth/login', { regNumber: regNumber.toUpperCase().trim(), password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'faculty' || res.data.user.role === 'admin' ? '/faculty' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please check your details.');
    } finally { setLoading(false); }
  };

  const demoLogin = (role: string) => {
    const demos: Record<string, any> = {
      student: { name: 'Arun Kumar', regNumber: '21CS001', role: 'student', mustChangePassword: false },
      faculty: { name: 'Dr. Priya Sharma', regNumber: 'FAC001', role: 'faculty', mustChangePassword: false },
    };
    localStorage.setItem('token', 'demo-jwt-' + role);
    localStorage.setItem('user', JSON.stringify(demos[role]));
    navigate(role === 'faculty' ? '/faculty' : '/dashboard');
  };

  return (
    <div className="page-center" style={{ transition: 'background 0.3s', position: 'relative' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '8%', left: '12%', width: '28vw', height: '28vw', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%', filter: 'blur(40px)' }} />
      <div style={{ position: 'fixed', bottom: '8%', right: '8%', width: '22vw', height: '22vw', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%', filter: 'blur(40px)' }} />

      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 300 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: 'center', marginBottom: '2.25rem' }}
        >
          <motion.div
            animate={isDark ? {
              boxShadow: [
                '0 0 20px rgba(99,102,241,0.3)',
                '0 0 40px rgba(139,92,246,0.5)',
                '0 0 20px rgba(99,102,241,0.3)',
              ]
            } : {}}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 1rem', color: 'white'
            }}
          ><Zap size={32} /></motion.div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
            Code<span style={{ color: 'var(--accent)' }}>Go</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 500 }}>
            AI-Powered Coding Assessment Platform
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="card-glass"
          style={{ padding: '2rem' }}
        >
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '1.5rem', fontWeight: 500 }}>
            Sign in to your account
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: '1rem' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="alert alert-error"
              >
                <AlertTriangle size={16} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Registration Number</label>
              <input
                id="regNumber"
                className="form-input mono"
                type="text"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21CS001"
                autoComplete="username"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem', position: 'relative' }}>
              <label className="form-label">Password</label>
              <input
                id="password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '0.75rem', bottom: '0.65rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', fontSize: '0.85rem', padding: 0,
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <motion.button
              id="loginBtn"
              type="submit"
              className="btn btn-primary btn-xl"
              disabled={loading}
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <><div className="spinner" /> Signing in...</>
              ) : <><span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Sign In <ArrowRight size={18} /></span></>}
            </motion.button>
          </form>

          <div className="divider" style={{ margin: '1.5rem 0' }} />

          <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Demo Access
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { role: 'student', label: <><GraduationCap size={14} /> Student Demo</>, id: 'demoStudentBtn' },
              { role: 'faculty', label: <><Users size={14} /> Faculty Demo</>, id: 'demoFacultyBtn' },
            ].map(d => (
              <motion.button
                key={d.role}
                id={d.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.55rem 0.75rem' }}
                onClick={() => demoLogin(d.role)}
              >
                {d.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '1.25rem' }}
        >
          <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>← Back to home</Link>
        </motion.p>
      </div>
    </div>
  );
}
