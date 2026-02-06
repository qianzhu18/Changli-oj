import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('wrong_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_resolved', false)
      .order('last_wrong_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ wrongQuestions: data || [] });
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
