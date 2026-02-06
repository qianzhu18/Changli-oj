import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();

    const { count: totalQuizzes } = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
    const { count: publishedQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);
    const { count: draftQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    const { count: failedQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');
    const { count: completedQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    const { count: pendingReports } = await supabase
      .from('error_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const parseSuccessRate = totalQuizzes ? (completedQuizzes || 0) / totalQuizzes : 0;

    return NextResponse.json({
      stats: {
        totalQuizzes: totalQuizzes || 0,
        publishedQuizzes: publishedQuizzes || 0,
        draftQuizzes: draftQuizzes || 0,
        failedQuizzes: failedQuizzes || 0,
        pendingReports: pendingReports || 0,
        parseSuccessRate
      }
    });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
