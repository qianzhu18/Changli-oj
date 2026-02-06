import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function signToken(payload: { userId: string; email: string }) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: string; email: string; exp: number };
}

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = await verifyToken(token);
    return { id: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export async function requireUser(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export function isAdminEmail(email: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!list.length) return true;
  return list.includes(email);
}
