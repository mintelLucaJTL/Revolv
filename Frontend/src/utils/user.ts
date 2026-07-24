// Shared helpers for reading/updating the profile of the currently logged-in user.
// Base URL of the backend API, matching the convention used across the rest of the frontend.
const API_BASE_URL = "http://localhost:5215";

export interface CurrentUser {
  id: number;
  email: string;
  name: string | null;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /api/user/me - profile of the currently authenticated user (based on the JWT token).
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/api/user/me`, {
    headers: { ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// PATCH /api/user/me - lets the user set/update their own display name.
export async function updateCurrentUserName(name: string): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/api/user/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// Turns "Luke Jansen" into "LJ". Falls back to the first two letters of a
// single-word name/email, e.g. "luke@example.com" -> "LU".
export function getInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
