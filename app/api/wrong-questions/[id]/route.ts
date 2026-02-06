import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const supabase = getSupabaseAdmin();
    await supabase
      .from('wrong_questions')
      .update({ is_resolved: true })
      .eq('id', params.id)
      .eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
