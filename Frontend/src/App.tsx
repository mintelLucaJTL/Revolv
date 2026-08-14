import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Profile from "./pages/profile";
import RetourenAnalyse from "./pages/Retouren-Analyse";
import Registrieren from "./pages/register";
import Settings from "./pages/settings";
import Team from "./pages/team";
import Aktionsplan from "./pages/aktionsplan";
import Erfolgsmessung from "./pages/erfolgsmessung";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import AppLayout from "./components/AppLayout";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import AcceptInvite from "./pages/accept-invite";
import Welcome from "./pages/welcome";

/** Gate for every authenticated page - renders the persistent AppLayout (header + sidebar) once
 *  for all nested routes, so navigating between them doesn't unmount/remount it (see AppLayout). */
function ProtectedLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout />;
}

/** Nested under ProtectedLayout: gates Admin-only routes (Settings, Mein Team) the same way. */
function AdminOutlet() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/** Auth-only gate without AppLayout - für Seiten wie /welcome, die bewusst kein
 *  Header/Sidebar zeigen sollen (Vollbild-Splash), aber trotzdem einen Login voraussetzen. */
function AuthOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Nach /welcome statt direkt /dashboard: login.tsx ruft nach dem Login zwar navigate("/welcome")
  // auf, aber AuthContext setzt isAuthenticated schon synchron innerhalb von login() - dieser Guard
  // hier rendert dadurch VOR dem eigenen navigate()-Aufruf neu und würde sonst das Rennen gewinnen
  // und direkt zu /dashboard springen, ohne dass die Animation je zu sehen ist.
  if (isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

function SessionRestoreScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute h-20 w-20 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse" />
        <span
          className="absolute h-20 w-20 rounded-2xl border-2 border-blue-500/50 dark:border-blue-500/60 animate-revolv-ring-pulse"
          style={{ animationDelay: "0.55s" }}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_60px_rgba(59,130,246,0.35)] dark:shadow-[0_0_60px_rgba(59,130,246,0.55)] animate-revolv-logo-in">
          <span className="text-3xl font-bold text-white">R</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 animate-revolv-text-in">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">Revolv</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">Sitzung wird geprüft…</span>
      </div>

      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500 animate-ai-scan" />
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <SessionRestoreScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Registrieren />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <ResetPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/accept-invite"
        element={
          <PublicOnlyRoute>
            <AcceptInvite />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/welcome"
        element={
          <AuthOnlyRoute>
            <Welcome />
          </AuthOnlyRoute>
        }
      />
      {/* Persistent header + sidebar (AppLayout) for every authenticated page - mounted once
          here, not per-page, so it survives navigation between the nested routes below. */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/retouren-analyse" element={<RetourenAnalyse />} />
        {/* /ki-empfehlungen retired: its filters moved into /retouren-analyse; falls through to
            the catch-all route below for old links/bookmarks. */}
        <Route path="/erfolgsmessung" element={<Erfolgsmessung />} />
        <Route path="/aktionsplan" element={<Aktionsplan />} />
        <Route path="/profile" element={<Profile />} />
        <Route element={<AdminOutlet />}>
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
