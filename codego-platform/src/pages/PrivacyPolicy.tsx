import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Privacy Policy',
    description: 'CodeGo Privacy Policy detailing institutional data governance, student FERPA protections, and AI evaluation privacy standards.',
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
            <Shield size={24} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Institutional Compliance
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--text-1)', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>
            Effective Date: September 1, 2026 · Last Updated: September 4, 2026 · Version 2.4
          </p>
        </motion.div>

        {/* Policy Content */}
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
              1. Institutional Role & Purpose
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              CodeGo Technologies (&quot;CodeGo&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) delivers high-consequence coding evaluation infrastructure to accredited academic institutions, colleges, and examination boards. We operate primarily as a <strong>School Official and Data Processor</strong> under the Family Educational Rights and Privacy Act (FERPA) and applicable institutional agreements.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              2. Data We Collect
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              In executing coding assessments, CodeGo processes only data necessary for academic evaluation:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Account Credentials:</strong> Student registration numbers, institutional email addresses, and university-affiliated role designations.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Source Code Submissions:</strong> Code text authored by candidates in response to assigned algorithmic problems, including compilation logs and runtime traces.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Assessment Telemetry:</strong> Keystroke cadence, tab-focus loss events, window blurs, and submission timestamps used strictly to guarantee proctoring integrity.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Essential Technical Logs:</strong> IP addresses, browser agent headers, and container sandbox resource utilization metrics.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              3. AI Evaluation & Model Integrity
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              Our proprietary and open-source evaluation models analyze submissions to generate static code critiques, identify algorithmic complexity ($O(N)$ heuristics), and detect syntax patterns.
            </p>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              <strong>We do NOT sell student data or student-authored source code.</strong> Student submissions are never used to train public commercial foundational models. All AI inference occurs in isolated virtual machines under rigorous institutional boundary controls.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              4. Cookies & Session Storage
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              CodeGo relies exclusively on secure, client-side session tokens (<code style={{ background: 'var(--bg-3)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>localStorage</code>) to maintain candidate authentication during assessments and prevent premature disconnects. We provide a cookie consent preference center so users can control optional anonymous telemetry.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              5. Security Safeguards
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              All network communications are encrypted end-to-end via TLS 1.3. Code compilation sandboxes are containerized with strict memory, process, and network quotas (Judge0 / gVisor isolation). Persistent gradebook databases are encrypted at rest using AES-256 standards.
            </p>
          </section>

          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
              6. Data Protection Officer & Contact Inquiries
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
              For inquiries regarding student privacy, FERPA records inspection, or institutional data governance, contact our Data Protection Office:
            </p>
            <div style={{ background: 'var(--bg-3)', borderRadius: '12px', padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-2)' }}>
                <MapPin size={18} style={{ color: 'var(--accent)' }} />
                <span>CodeGo Systems · Academic Innovation Center, 3215 Porter Dr, Palo Alto, CA 94304</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-2)' }}>
                <Mail size={18} style={{ color: 'var(--accent)' }} />
                <span>privacy@codego.dev · dpo@codego.dev</span>
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
          <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Terms of Service →
          </Link>
          <Link to="/" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
