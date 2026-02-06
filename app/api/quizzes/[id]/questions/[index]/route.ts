import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseHtmlToQuestions } from '@/lib/quiz-parser';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string; index: string } }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('quizzes')
    .select('html')
    .eq('id', params.id)
    .single();
  if (error || !data?.html) {
    return NextResponse.json({ error: '题库不存在或未解析' }, { status: 404 });
  }
  const questions = parseHtmlToQuestions(data.html);
  const index = Number(params.index);
  const question = questions[index];
  if (!question) {
    return NextResponse.json({ error: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json({ question });
}
