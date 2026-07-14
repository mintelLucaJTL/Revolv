import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Profile from "./pages/profile";

// Diese Komponente schützt eine Route vor Zugriff ohne gültiges Token.
function ProtectedRoute({ children }: { children: ReactNode }) {
  // Aktuellen Pfad merken, damit wir später zurückleiten können, falls nötig.
  const location = useLocation();

  // Token aus dem Browser-LocalStorage lesen.
  const token = localStorage.getItem("authToken");

  // Wenn kein Token gespeichert ist, geht es zurück zum Login.
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wenn ein Token vorhanden ist, erlauben wir den Zugriff auf die Kinderkomponente.
  return children;
}

export default function App() {
  const token = localStorage.getItem("authToken");

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
