import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Profile from "./pages/profile";
import RetourenAnalyse from "./pages/Retouren-Analyse";
import AIRecommendationView from "./pages/AIRecommendationview";
import Registrieren from "./pages/register";
import Settings from "./pages/settings";
import { isTokenExpired } from "./utils/api";
import { ToastProvider } from "./components/Toast";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";

function hasValidSession(): boolean {
  const token = localStorage.getItem("authToken");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("authToken");
    return false;
  }
  return true;
}

// Diese Komponente schützt eine Route vor Zugriff ohne gültiges Token.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!hasValidSession()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Verhindert, dass ein bereits gültig eingeloggter Nutzer /login oder /register aufruft.
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  if (hasValidSession()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to={hasValidSession() ? "/dashboard" : "/login"} replace />} />
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
        <Route
          path="/ki-empfehlungen"
          element={
            <ProtectedRoute>
              <AIRecommendationView />
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
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
