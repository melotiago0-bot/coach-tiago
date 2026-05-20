export const API = 'https://coach-tiago-api-production.up.railway.app';

const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * Wrapper de fetch que adiciona automaticamente o header de autenticação.
 * Usar sempre em vez de fetch() direto para chamadas à API.
 */
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    ...options.headers,
  };
  return fetch(`${API}${path}`, { ...options, headers });
}
