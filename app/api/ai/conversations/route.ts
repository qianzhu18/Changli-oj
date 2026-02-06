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
    const questionText = String(body.questionText || '');
    const explanation = String(body.explanation || '');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        question_index: questionIndex,
        context: { questionText, explanation },
        messages: []
      })
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || '创建对话失败' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: data.id, messages: [] });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: '创建对话失败' }, { status: 500 });
  }
}
