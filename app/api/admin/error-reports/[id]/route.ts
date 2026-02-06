import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const payload: Record<string, unknown> = {};
    if (typeof body.status === 'string') payload.status = body.status;
    if (typeof body.admin_note === 'string') payload.admin_note = body.admin_note;
    const supabase = getSupabaseAdmin();
    await supabase.from('error_reports').update(payload).eq('id', params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
