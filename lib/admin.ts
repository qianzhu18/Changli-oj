import { NextRequest } from 'next/server';
import { requireUser, isAdminEmail } from '@/lib/auth';

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);
  if (!isAdminEmail(user.email)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
