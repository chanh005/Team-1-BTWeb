import type { ChuyenDi } from './types';

// Same convention as src/api.ts: a relative path, proxied to the local Express server in dev and served by the
// Vercel functions in production. Kept in this module so the shared api client stays untouched.
export async function fetchChuyenDi(email: string): Promise<ChuyenDi[]> {
  const res = await fetch(`/api/chuyen-di?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
