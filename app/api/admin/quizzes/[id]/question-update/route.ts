import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { parseHtmlToQuestions, questionsToHtml } from '@/lib/quiz-parser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const index = Number(body.index || 0);
    const newAnswer = body.correctAnswer as string | undefined;
    const newExplanation = body.explanation as string | undefined;

    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('quizzes').select('html').eq('id', params.id).single();
    if (!data?.html) {
      return NextResponse.json({ error: '题库不存在' }, { status: 404 });
    }
    const questions = parseHtmlToQuestions(data.html);
    const target = questions.find((q) => q.index === index);
    if (!target) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 });
    }
    if (typeof newAnswer === 'string') {
      target.correctAnswer = newAnswer;
    }
    if (typeof newExplanation === 'string') {
      target.explanation = newExplanation;
    }
    const html = questionsToHtml(questions);
    await supabase
      .from('quizzes')
      .update({ html, updated_at: new Date().toISOString() })
      .eq('id', params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
