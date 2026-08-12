import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Profile from "./pages/profile";
import RetourenAnalyse from "./pages/Retouren-Analyse";
import Registrieren from "./pages/register";
import Settings from "./pages/settings";
import Team from "./pages/team";
import Erfolgsmessung from "./pages/erfolgsmessung";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import AppLayout from "./components/AppLayout";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import AcceptInvite from "./pages/accept-invite";

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

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
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
      {/* Persistent header + sidebar (AppLayout) for every authenticated page - mounted once
          here, not per-page, so it survives navigation between the nested routes below. */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/retouren-analyse" element={<RetourenAnalyse />} />
        {/* /ki-empfehlungen retired: its filters moved into /retouren-analyse; falls through to
            the catch-all route below for old links/bookmarks. */}
        <Route path="/erfolgsmessung" element={<Erfolgsmessung />} />
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
