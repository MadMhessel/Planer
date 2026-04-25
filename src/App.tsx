import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute } from './components/auth/GuestRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { ToastViewport } from './components/ui/ToastViewport';

const Landing = lazy(async () => ({ default: (await import('./pages/Landing')).Landing }));
const Login = lazy(async () => ({ default: (await import('./pages/Login')).Login }));
const Register = lazy(async () => ({ default: (await import('./pages/Register')).Register }));
const Dashboard = lazy(async () => ({ default: (await import('./pages/Dashboard')).Dashboard }));
const KnowledgeBase = lazy(async () => ({ default: (await import('./pages/KnowledgeBase')).KnowledgeBase }));
const Personality = lazy(async () => ({ default: (await import('./pages/Personality')).Personality }));
const Testing = lazy(async () => ({ default: (await import('./pages/Testing')).Testing }));
const Integrations = lazy(async () => ({ default: (await import('./pages/Integrations')).Integrations }));
const Analytics = lazy(async () => ({ default: (await import('./pages/Analytics')).Analytics }));
const Deploy = lazy(async () => ({ default: (await import('./pages/Deploy')).Deploy }));

const fallback = (
  <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm font-medium text-slate-600" aria-busy="true">
    Загрузка интерфейса...
  </div>
);

const App = () => {
  return (
    <>
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/personality" element={<Personality />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/deploy" element={<Deploy />} />
            </Route>
          </Route>

          <Route path="/конструктор" element={<Navigate to="/dashboard" replace />} />
          <Route path="/база-знаний" element={<Navigate to="/knowledge" replace />} />
          <Route path="/личность" element={<Navigate to="/personality" replace />} />
          <Route path="/тестирование" element={<Navigate to="/testing" replace />} />
          <Route path="/интеграции" element={<Navigate to="/integrations" replace />} />
          <Route path="/аналитика" element={<Navigate to="/analytics" replace />} />
          <Route path="/деплой" element={<Navigate to="/deploy" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  );
};

export default App;
