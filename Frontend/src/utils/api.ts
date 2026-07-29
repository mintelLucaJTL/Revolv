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
  // If the path is an absolute URL, use it as is, otherwise prepend the API base URL
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  // Fetch the data from the API
  const response = await fetch(url, {
    ...options, // Merge the custom options with the auth headers
    credentials: "include",
    headers: {
      ...getAuthHeaders(), // Get the authentication headers from the in-memory token
      ...options.headers, // Merge the custom headers with the auth headers
    },
  });

  if (response.status === 401 && !isRetryAfterRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiFetch(path, options, true);
    }

    await logout();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return response;
}
