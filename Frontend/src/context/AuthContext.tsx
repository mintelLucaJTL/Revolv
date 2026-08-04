import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authStore from "../utils/authStore";

interface AuthContextValue {
  isAuthenticated: boolean;
  // True until the initial silent refresh (session restore from the cookie) has finished.
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authStore.isSessionActive());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = authStore.subscribe((session) => setIsAuthenticated(session != null));

    // Access tokens are memory-only - try to restore the session from the refresh cookie.
    authStore.refreshAccessToken().finally(() => setIsInitializing(false));

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    isInitializing,
    login: authStore.login,
    logout: authStore.logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
