import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    await supabase.from('quizzes').update({ is_published: false }).eq('id', params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
