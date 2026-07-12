import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { lazy, Suspense } from 'react';
import ParticlesBackground from './components/ParticlesBackground';
import WireframeGrid from './components/WireframeGrid';
import Navbar from './components/Navbar';
import CustomCursor from './components/CustomCursor';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Results = lazy(() => import('./pages/Results'));
const Profile = lazy(() => import('./pages/Profile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'));

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
  let user: any = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  if (user.role !== 'faculty' && user.role !== 'admin' && !token.startsWith('demo-faculty')) {
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
        <CustomCursor />

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ThemeProvider>
  );
}
