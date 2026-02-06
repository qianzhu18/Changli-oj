import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const supabase = getSupabaseAdmin();
    let query = supabase.from('quizzes').select('*');
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const quizzes = data || [];
    if (!quizzes.length) {
      return NextResponse.json({ quizzes: [] });
    }

    const quizIds = quizzes.map((quiz) => quiz.id);
    const { data: jobs } = await supabase
      .from('jobs')
      .select('quiz_id, created_at, result')
      .eq('type', 'parse')
      .in('quiz_id', quizIds)
      .order('created_at', { ascending: false });

    const parseModeMap = new Map<string, string>();
    for (const job of jobs || []) {
      if (!job.quiz_id || parseModeMap.has(job.quiz_id)) continue;
      const mode = (job.result as { parseMode?: string } | null)?.parseMode;
      if (mode) {
        parseModeMap.set(job.quiz_id, mode);
      }
    }

    return NextResponse.json({
      quizzes: quizzes.map((quiz) => ({
        ...quiz,
        parse_mode: parseModeMap.get(quiz.id) || null
      }))
    });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
