import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Profile from "./pages/profile";
import RetourenAnalyse from "./pages/Retouren-Analyse";
import AIRecommendationView from "./pages/AIRecommendationview";
import Registrieren from "./pages/register";
import Settings from "./pages/settings";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";

// Diese Komponente schützt eine Route vor Zugriff ohne gültiges Token.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registrieren />} />
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
