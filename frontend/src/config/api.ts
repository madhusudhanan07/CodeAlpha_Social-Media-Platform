// Central API configuration — single source of truth for the backend URL.
// Change VITE_API_BASE_URL in .env to switch between local / production.

export const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'http://localhost:5000';

export const API_URL: string = `${BASE_URL}/api`;

