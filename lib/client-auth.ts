'use client';

const TOKEN_KEY = 'changli_token';
const USER_KEY = 'changli_user';

export function storeAuth(token: string, user: { id: string; email: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): { id?: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; email: string };
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('未登录或登录已过期');
  }
  if (!res.ok) {
    const text = await res.text();
    if (!text) {
      throw new Error(`请求失败 (${res.status})`);
    }
    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      throw new Error(payload.error || payload.message || `请求失败 (${res.status})`);
    } catch {
      throw new Error(text || `请求失败 (${res.status})`);
    }
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {} as T;
  }
  return res.json();
}
