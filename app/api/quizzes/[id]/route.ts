import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, question_count')
    .eq('id', params.id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: '题库不存在' }, { status: 404 });
  }
  return NextResponse.json({ quiz: data });
}
