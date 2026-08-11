import { API_BASE_URL } from "./apiBase";
import { decodeRoleFromAccessToken, type RoleName } from "./roles";

// Framework-agnostic auth singleton, so both `AuthContext` (React state) and plain functions
// like `apiFetch` can read/trigger the same session.
//
// The access token lives ONLY in memory, never in localStorage/sessionStorage. Session continuity
// across reloads comes from the HttpOnly refresh cookie via `refreshAccessToken()` on startup.

export interface SessionInfo {
  accessToken: string;
  // Absolute session deadline from the server (startedAt + 2h), in epoch ms. UX only -
  // real enforcement always happens server-side in POST /api/auth/refresh.
  sessionExpiresAt: number;
}

type Listener = (session: SessionInfo | null) => void;

let currentSession: SessionInfo | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<SessionInfo | null> | null = null;
const listeners = new Set<Listener>();

// Refresh once the access token has used up this fraction of its lifetime (80-90% per the ticket).
const PROACTIVE_REFRESH_FRACTION = 0.8;
// Safety margin used by the visibility-change check below: if less than this remains, refresh now.
const FOCUS_REFRESH_THRESHOLD_MS = 60_000;

export function getAccessToken(): string | null {
  return currentSession?.accessToken ?? null;
}

export function getSessionExpiresAt(): number | null {
  return currentSession?.sessionExpiresAt ?? null;
}

/** Role from the in-memory access token (UI gating only; API enforces auth). */
export function getRole(): RoleName | null {
  return decodeRoleFromAccessToken(currentSession?.accessToken);
}

export function isSessionActive(): boolean {
  return currentSession != null;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener(currentSession);
  }
}

// Reads the "exp" claim from a JWT without verifying it - only used to schedule a proactive
// refresh, never for security decisions.
function decodeExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function clearRefreshTimer() {
  if (refreshTimer != null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleProactiveRefresh(accessToken: string) {
  clearRefreshTimer();

  const expiresAtMs = decodeExpiryMs(accessToken);
  if (expiresAtMs == null) return;

  const lifetimeMs = expiresAtMs - Date.now();
  const delayMs = Math.max(lifetimeMs * PROACTIVE_REFRESH_FRACTION, 1000);

  refreshTimer = setTimeout(() => {
    void refreshAccessToken();
  }, delayMs);
}

function setSession(accessToken: string, sessionExpiresAt: number) {
  currentSession = { accessToken, sessionExpiresAt };
  scheduleProactiveRefresh(accessToken);
  notify();
}

export function clearSession() {
  currentSession = null;
  clearRefreshTimer();
  notify();
}

function parseSessionResponse(data: {
  token?: string;
  sessionExpiresAt?: string;
}): SessionInfo | null {
  if (!data.token || !data.sessionExpiresAt) return null;
  const expiresAtMs = new Date(data.sessionExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return { accessToken: data.token, sessionExpiresAt: expiresAtMs };
}

// Rotates the refresh cookie and obtains a fresh access token. Safe to call concurrently -
// all callers share the same in-flight request instead of firing duplicate refresh calls.
export function refreshAccessToken(): Promise<SessionInfo | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const data = await response.json();
      const session = parseSessionResponse(data);
      if (!session) {
        clearSession();
        return null;
      }

      setSession(session.accessToken, session.sessionExpiresAt);
      return session;
    } catch {
      // Network error: keep the current token, just give up on this attempt and try again later.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.token) {
    throw new Error(data?.message ?? "Ungültige E-Mail oder Passwort.");
  }

  const session = parseSessionResponse(data);
  if (!session) {
    throw new Error("Unerwartete Antwort vom Server.");
  }

  setSession(session.accessToken, session.sessionExpiresAt);
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort: even if the request fails, the local session is still cleared below.
  } finally {
    clearSession();
  }
}

// Tab regained focus: refresh immediately if the access token is already expired or about to be
// (e.g. the tab/laptop was suspended and the proactive timer never ran).
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || currentSession == null) return;

    const expiresAtMs = decodeExpiryMs(currentSession.accessToken);
    if (expiresAtMs == null) return;

    if (expiresAtMs - Date.now() < FOCUS_REFRESH_THRESHOLD_MS) {
      void refreshAccessToken();
    }
  });
}
