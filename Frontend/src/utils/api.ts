import { API_BASE_URL } from "./apiBase";
import { getAccessToken, logout, refreshAccessToken } from "./authStore";

// Central place for talking to the backend. Every authenticated request should go through
// `apiFetch` below.
export { API_BASE_URL };

// Reads the auth header from the in-memory access token (see authStore.ts), never from localStorage.
function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * @param path Relative path (e.g. "/api/settings") or absolute URL.
 * @param options Same options as `fetch`; any custom headers are merged on top of the auth header.
 */
// Wrapper around `fetch` that attaches the Bearer token, sends the refresh cookie, and on 401
// tries one silent refresh + retry before logging out and redirecting to /login.
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  isRetryAfterRefresh = false,
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401 && !isRetryAfterRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiFetch(path, options, true);
    }

    // Only force logout when the session was cleared (auth rejection). Network blips keep
    // the in-memory token and return the original 401 to the caller.
    if (!getAccessToken()) {
      await logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  }

  return response;
}
