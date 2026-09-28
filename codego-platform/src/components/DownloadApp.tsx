// DownloadApp.tsx — OS-aware desktop download banner for CodeGo Landing page
// Detects Windows / macOS / Linux from navigator.userAgent and links to the
// correct GitHub Release asset. Falls back to showing all three options.

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Apple, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ─── GitHub repo and release tag ─────────────────────────────────────────────
const GITHUB_REPO = 'Barani2504/Codego_Compiler';
const RELEASE_TAG = 'v1.0.0';
const BASE_URL = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}`;

interface DownloadOption {
  os: 'windows' | 'mac' | 'linux';
  label: string;
  sublabel: string;
  file: string;
  icon: typeof Monitor;
  color: string;
  bg: string;
  border: string;
}

const DOWNLOADS: DownloadOption[] = [
  {
    os: 'windows',
    label: 'Windows',
    sublabel: 'Windows 10/11 · 64-bit',
    file: 'CodeGo-Setup-Windows.exe',
    icon: Monitor,
    color: '#0078d4',
    bg: 'rgba(0,120,212,0.1)',
    border: 'rgba(0,120,212,0.25)',
  },
  {
    os: 'mac',
    label: 'macOS',
    sublabel: 'macOS 12+ · Apple Silicon & Intel',
    file: 'CodeGo-macOS.dmg',
    icon: Apple,
    color: '#888888',
    bg: 'rgba(130,130,130,0.1)',
    border: 'rgba(130,130,130,0.25)',
  },
  {
    os: 'linux',
    label: 'Linux',
    sublabel: 'Ubuntu / Fedora / Arch · x64',
    file: 'CodeGo-Linux.AppImage',
    icon: Terminal,
    color: '#e95420',
    bg: 'rgba(233,84,32,0.1)',
    border: 'rgba(233,84,32,0.25)',
  },
];

type OS = 'windows' | 'mac' | 'linux' | 'unknown';

function detectOS(): OS {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'unknown';
}

export default function DownloadApp() {
  const { isDark } = useTheme();
  const [detectedOS, setDetectedOS] = useState<OS>('unknown');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setDetectedOS(detectOS());
  }, []);

  const primaryDownload = DOWNLOADS.find((d) => d.os === detectedOS) ?? DOWNLOADS[0];
  const otherDownloads = DOWNLOADS.filter((d) => d.os !== primaryDownload.os);
  const PrimaryIcon = primaryDownload.icon;

  return (
    <section style={{ padding: '0 2rem 5rem', textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: 680, margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 99, padding: '0.3rem 0.9rem', marginBottom: '1.25rem',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em',
        }}>
          <Download size={12} />
          DESKTOP APP
        </div>

        <h2 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 800, color: 'var(--text-1)', marginBottom: '0.75rem', lineHeight: 1.2,
        }}>
          Take CodeGo offline
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Native desktop app for invigilated exam environments. Works without a browser.
        </p>

        {/* Primary OS Download Card */}
        <motion.a
          href={`${BASE_URL}/${primaryDownload.file}`}
          download
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '1rem', padding: '1.25rem 1.5rem',
            background: isDark ? 'var(--bg-2)' : '#fff',
            border: `1px solid ${primaryDownload.border}`,
            borderRadius: 16, textDecoration: 'none', cursor: 'pointer',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: primaryDownload.bg, border: `1px solid ${primaryDownload.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PrimaryIcon size={22} color={primaryDownload.color} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>
                Download for {primaryDownload.label}
                {detectedOS !== 'unknown' && (
                  <span style={{
                    marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 600,
                    padding: '0.15rem 0.45rem', borderRadius: 5, verticalAlign: 'middle',
                    background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)',
                  }}>
                    Detected
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                {primaryDownload.sublabel} · {primaryDownload.file}
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: '#fff', padding: '0.55rem 1.1rem', borderRadius: 10,
            fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
            boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
          }}>
            <Download size={14} /> Download
          </div>
        </motion.a>

        {/* Toggle other platforms */}
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '0.8rem', display: 'flex',
            alignItems: 'center', gap: '0.3rem', margin: '0 auto 0',
            padding: '0.4rem 0.75rem', borderRadius: 8, transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAll ? 'Hide other platforms' : 'Other platforms'}
        </button>

        {/* Other OS Downloads */}
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}
          >
            {otherDownloads.map((d) => {
              const Icon = d.icon;
              return (
                <motion.a
                  key={d.os}
                  href={`${BASE_URL}/${d.file}`}
                  download
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.875rem 1.25rem',
                    background: isDark ? 'var(--bg-2)' : '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12, textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: d.bg, border: `1px solid ${d.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color={d.color} />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.87rem' }}>{d.label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{d.sublabel}</div>
                  </div>
                  <Download size={14} color="var(--text-3)" />
                </motion.a>
              );
            })}
          </motion.div>
        )}

        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '1.25rem' }}>
          Free & open source · Electron v41 · Connects to your institution's CodeGo server
        </p>
      </motion.div>
    </section>
  );
}
