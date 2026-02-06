import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedisConnection } from '@/lib/queue';

export const runtime = 'nodejs';

export async function GET() {
  const result: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    services: {
      app: 'ok',
      supabase: 'unknown',
      redis: 'unknown'
    }
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('users').select('id', { head: true, count: 'exact' });
    if (error) {
      result.ok = false;
      result.services = { ...(result.services as object), supabase: `error: ${error.message}` };
    } else {
      result.services = { ...(result.services as object), supabase: 'ok' };
    }
  } catch (err) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      supabase: `error: ${err instanceof Error ? err.message : 'unknown'}`
    };
  }

  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    result.services = { ...(result.services as object), redis: pong.toLowerCase() === 'pong' ? 'ok' : pong };
  } catch (err) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      redis: `error: ${err instanceof Error ? err.message : 'unknown'}`
    };
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
