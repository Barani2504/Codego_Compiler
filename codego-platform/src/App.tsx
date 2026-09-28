import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { lazy, Suspense } from 'react';
import ParticlesBackground from './components/ParticlesBackground';
import WireframeGrid from './components/WireframeGrid';
import Navbar from './components/Navbar';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Results = lazy(() => import('./pages/Results'));
const Profile = lazy(() => import('./pages/Profile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ThankYou = lazy(() => import('./pages/ThankYou'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
import CookieBanner from './components/CookieBanner';

/**
 * Parse the JWT payload WITHOUT verifying the signature.
 * This is intentionally client-side only — it provides the UI with the role
 * information embedded by the server at sign time. The server always re-validates
 * the full JWT on every API call, so this cannot escalate privileges.
 */
function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTokenRole(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  // Demo tokens bypass JWT parsing
  if (token.startsWith('demo-faculty')) return 'faculty';
  if (token.startsWith('demo-')) return 'student';
  const payload = parseJwtPayload(token);
  return payload?.role ?? null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  return !localStorage.getItem('token') ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function FacultyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  // Role is derived from the JWT payload — not from mutable localStorage.user
  const role = getTokenRole();
  if (role !== 'faculty' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
    </>
  );
}

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        {/* Global ambient effects - render behind everything */}
        <WireframeGrid />
        <ParticlesBackground />
        <CookieBanner />

        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
            <Route path="/assessment" element={<PrivateRoute><AppLayout><Assessment /></AppLayout></PrivateRoute>} />
            <Route path="/results" element={<PrivateRoute><AppLayout><Results /></AppLayout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
            <Route path="/change-password" element={<PrivateRoute><AppLayout><ChangePassword /></AppLayout></PrivateRoute>} />
            <Route path="/faculty" element={<FacultyRoute><AppLayout><FacultyDashboard /></AppLayout></FacultyRoute>} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ThemeProvider>
  );
}
