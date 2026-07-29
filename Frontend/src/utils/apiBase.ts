// Central place for the backend base URL - kept in its own module (no other exports) so both
// api.ts and authStore.ts can depend on it without risking a circular import between the two.
export const API_BASE_URL = "http://localhost:5215";
