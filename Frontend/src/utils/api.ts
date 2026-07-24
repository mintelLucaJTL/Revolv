// Central place for talking to the backend. Every authenticated request should go through
export const API_BASE_URL = "http://localhost:5215";

// Get the authentication headers from the local storage
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Prüft, ob ein JWT abgelaufen ist. Bei kaputtem/ungültigem Token wird "abgelaufen" angenommen.
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return payload.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

/**
 * @param path Relative path (e.g. "/api/settings") or absolute URL.
 * @param options Same options as `fetch`; any custom headers are merged on top of the auth header.
 */

// Wrapper around `fetch` that:
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // If the path is an absolute URL, use it as is, otherwise prepend the API base URL
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  // Fetch the data from the API
  const response = await fetch(url, {
    ...options, // Merge the custom options with the auth headers
    headers: {
      ...getAuthHeaders(), // Get the authentication headers from the local storage
      ...options.headers, // Merge the custom headers with the auth headers
    },
  });

  // If the response is 401, remove the token from the local storage and redirect to the login page
  if (response.status === 401) {
    localStorage.removeItem("authToken");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return response;
}
