import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const quizId = String(body.quizId || '');
    const questionIndex = Number(body.questionIndex || 0);
    const errorType = String(body.errorType || '其他');
    const description = String(body.description || '');

    const supabase = getSupabaseAdmin();
    const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).single();

    const { error } = await supabase.from('error_reports').insert({
      user_id: user.id,
      quiz_id: quizId,
      quiz_title: quiz?.title || '',
      question_index: questionIndex,
      error_type: errorType,
      description,
      status: 'pending'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
