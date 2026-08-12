import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import AcceptInvite from "./pages/accept-invite";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/** Authenticated Admin-only routes (Settings, Mein Team). */
function AdminRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/retouren-analyse"
        element={
          <ProtectedRoute>
            <RetourenAnalyse />
          </ProtectedRoute>
        }
      />
      {/* /ki-empfehlungen retired: its filters moved into /retouren-analyse; falls through to the
          catch-all route below for old links/bookmarks. */}
      <Route
        path="/erfolgsmessung"
        element={
          <ProtectedRoute>
            <Erfolgsmessung />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <AdminRoute>
            <Team />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminRoute>
            <Settings />
          </AdminRoute>
        }
      />
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
