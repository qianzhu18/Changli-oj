import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { parseHtmlToQuestions } from '@/lib/quiz-parser';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    if (quizId) {
      const { data } = await supabase
        .from('user_progress')
        .select('quiz_id, current_index, completed_count, correct_count, wrong_count')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .single();
      return NextResponse.json({ progress: data || { current_index: 0 } });
    }
    const { data } = await supabase
      .from('user_progress')
      .select('quiz_id, current_index, completed_count, correct_count, wrong_count')
      .eq('user_id', user.id);
    return NextResponse.json({ progress: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const quizId = String(body.quizId || '');
    const questionIndex = Number(body.questionIndex || 0);
    const isCorrect = Boolean(body.isCorrect);
    const userAnswer = String(body.userAnswer || '');

    if (!quizId) {
      return NextResponse.json({ error: '缺少题库ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quizId)
      .single();

    const nextIndex = questionIndex + 1;
    const completedCount = (existing?.completed_count || 0) + 1;
    const correctCount = (existing?.correct_count || 0) + (isCorrect ? 1 : 0);
    const wrongCount = (existing?.wrong_count || 0) + (isCorrect ? 0 : 1);

    if (existing) {
      await supabase
        .from('user_progress')
        .update({
          current_index: nextIndex,
          completed_count: completedCount,
          correct_count: correctCount,
          wrong_count: wrongCount,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_progress').insert({
        user_id: user.id,
        quiz_id: quizId,
        current_index: nextIndex,
        completed_count: completedCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        last_accessed_at: new Date().toISOString()
      });
    }

    if (!isCorrect) {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('html, title')
        .eq('id', quizId)
        .single();
      const questions = quiz?.html ? parseHtmlToQuestions(quiz.html) : [];
      const question = questions[questionIndex];
      const { data: wrongExisting } = await supabase
        .from('wrong_questions')
        .select('*')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .eq('question_index', questionIndex + 1)
        .single();

      if (wrongExisting) {
        await supabase
          .from('wrong_questions')
          .update({
            wrong_count: wrongExisting.wrong_count + 1,
            last_wrong_at: new Date().toISOString(),
            wrong_answer: userAnswer
          })
          .eq('id', wrongExisting.id);
      } else {
        await supabase.from('wrong_questions').insert({
          user_id: user.id,
          quiz_id: quizId,
          quiz_title: quiz?.title || '',
          question_index: questionIndex + 1,
          question_text: question?.questionText || '',
          wrong_answer: userAnswer,
          correct_answer: question?.correctAnswer || '',
          wrong_count: 1,
          last_wrong_at: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
