import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);

export async function setSession(id) {
  const t = await new SignJWT({ id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(key());
  cookies().set('s', t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export async function getUser() {
  const t = cookies().get('s')?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload.id; } catch { return null; }
}
export const clearSession = () => cookies().delete('s');
