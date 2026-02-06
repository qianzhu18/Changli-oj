import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { parseHtmlToQuestions } from '@/lib/quiz-parser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('quizzes').select('html').eq('id', params.id).single();
    if (!data?.html) {
      return NextResponse.json({ error: '题库未解析' }, { status: 400 });
    }
    const questions = parseHtmlToQuestions(data.html);
    if (!questions.length || questions.some((q) => !q.correctAnswer)) {
      return NextResponse.json({ error: '题库内容不完整' }, { status: 400 });
    }
    await supabase
      .from('quizzes')
      .update({ is_published: true, status: 'completed', question_count: questions.length })
      .eq('id', params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
