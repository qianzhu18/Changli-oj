import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { getParseQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('quizzes').select('*').eq('id', params.id).single();
    if (!data) {
      return NextResponse.json({ error: '题库不存在' }, { status: 404 });
    }

    await supabase
      .from('quizzes')
      .update({ status: 'pending', parse_progress: 0, error_msg: null })
      .eq('id', params.id);

    const { data: job } = await supabase
      .from('jobs')
      .insert({
        quiz_id: params.id,
        type: 'parse',
        status: 'pending',
        progress: 0,
        data: { filePath: data.file_path, rawText: data.raw_text }
      })
      .select('id')
      .single();

    const queue = getParseQueue();
    await queue.add(
      'parse',
      {
        quizId: params.id,
        filePath: data.file_path,
        rawText: data.raw_text,
        jobId: job?.id
      },
      {
        attempts: 2,
        removeOnComplete: 50,
        removeOnFail: 100
      }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
