import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();

    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { data: quizzes } = await supabase.from('quizzes').select('id, title, question_count');
    const { data: progresses } = await supabase.from('user_progress').select('quiz_id, completed_count');

    const totalQuizzes = quizzes?.length || 0;
    const totalQuestions = quizzes?.reduce((sum, quiz) => sum + (quiz.question_count || 0), 0) || 0;
    const totalAttempts = progresses?.reduce((sum, row) => sum + (row.completed_count || 0), 0) || 0;

    const attemptMap: Record<string, number> = {};
    (progresses || []).forEach((row) => {
      attemptMap[row.quiz_id] = (attemptMap[row.quiz_id] || 0) + (row.completed_count || 0);
    });

    const topQuizzes = (quizzes || [])
      .map((quiz) => ({ title: quiz.title, attempts: attemptMap[quiz.id] || 0 }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalQuizzes,
        totalQuestions,
        totalAttempts,
        topQuizzes
      }
    });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
