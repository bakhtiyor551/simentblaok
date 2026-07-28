const API_URL = import.meta.env.VITE_API_URL || 'http://161.129.67.147:8081/api';

export type AuthUser = {
  id: string;
  login: string;
  role: string;
  roleName?: string;
  employee?: { id: string; fullName: string } | null;
};

export function getToken() {
  return localStorage.getItem('blockerp_token');
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || 'Ошибка запроса');
  }
  return res.json();
}

export { API_URL };
