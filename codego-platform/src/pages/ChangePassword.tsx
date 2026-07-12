import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Handle demo mode bypass
    const token = localStorage.getItem('token');
    if (token?.startsWith('demo-')) {
      setSuccess(true);
      let user: any = {};
      try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
      user.mustChangePassword = false;
      localStorage.setItem('user', JSON.stringify(user));
      setTimeout(() => navigate('/dashboard'), 1500);
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/change-password', 
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      let user: any = {};
      try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
      user.mustChangePassword = false;
      localStorage.setItem('user', JSON.stringify(user));
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ position: 'relative' }}>
      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 300 }}>
        <ThemeToggle />
      </div>

      <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.02} transitionSpeed={800} glareEnable glareMaxOpacity={0.05}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="card-glass"
          style={{ width: 420, padding: '2.5rem' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', margin: '0 auto 1rem',
              boxShadow: '0 8px 32px var(--accent-glow)'
            }}>🔒</div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>Set New Password</h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-3)', fontSize: '0.85rem' }}>
              You need to set a personal password before continuing.
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '1.5rem', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 12, textAlign: 'center', color: 'var(--green)' }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Password updated successfully!</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--green)' }}>Redirecting to dashboard...</div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="alert alert-error"
                  >
                    <span>⚠</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-xl"
                style={{ width: '100%' }}
              >
                {loading ? <><div className="spinner" /> Updating...</> : 'Set Password →'}
              </motion.button>
            </form>
          )}
        </motion.div>
      </Tilt>
    </div>
  );
}
