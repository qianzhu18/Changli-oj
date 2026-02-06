import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { parseHtmlToQuestions } from '@/lib/quiz-parser';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('quizzes').select('html').eq('id', params.id).single();
    if (!data?.html) {
      return NextResponse.json({ questions: [] });
    }
    const questions = parseHtmlToQuestions(data.html).map((q) => ({
      index: q.index,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
