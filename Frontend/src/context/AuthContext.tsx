import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authStore from "../utils/authStore";
import { isAdminRole, type RoleName } from "../utils/roles";

interface AuthContextValue {
  isAuthenticated: boolean;
  // True until the initial silent refresh (session restore from the cookie) has finished.
  isInitializing: boolean;
  /** Role claim from the current access token; null when logged out. */
  role: RoleName | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Rotates the access token so role claims update after a role change. Returns false if refresh failed. */
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authStore.isSessionActive());
  const [role, setRole] = useState<RoleName | null>(authStore.getRole());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = authStore.subscribe((session) => {
      setIsAuthenticated(session != null);
      setRole(authStore.getRole());
    });

    // Access tokens are memory-only - try to restore the session from the refresh cookie.
    authStore.refreshAccessToken().finally(() => setIsInitializing(false));

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    isInitializing,
    role,
    isAdmin: isAdminRole(role),
    login: authStore.login,
    logout: authStore.logout,
    refreshSession: async () => {
      const session = await authStore.refreshAccessToken();
      return session != null;
    },
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
