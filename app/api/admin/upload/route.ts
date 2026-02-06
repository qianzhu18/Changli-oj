import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getParseQueue } from '@/lib/queue';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!['.txt', '.md'].includes(ext)) {
      return NextResponse.json({ error: '仅支持 TXT/MD 文件' }, { status: 400 });
    }
    const maxSize = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件过大' }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = buffer.toString('utf-8');

    const supabase = getSupabaseAdmin();
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title: path.basename(file.name, ext),
        status: 'pending',
        question_count: 0,
        parse_progress: 0,
        is_published: false,
        raw_text: rawText
      })
      .select('*')
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: error?.message || '创建题库失败' }, { status: 500 });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${quiz.id}${ext}`);
    await fs.writeFile(filePath, buffer);

    await supabase.from('quizzes').update({ file_path: filePath }).eq('id', quiz.id);

    const { data: job } = await supabase
      .from('jobs')
      .insert({
        quiz_id: quiz.id,
        type: 'parse',
        status: 'pending',
        progress: 0,
        data: { filePath }
      })
      .select('id')
      .single();

    const queue = getParseQueue();
    await queue.add(
      'parse',
      { quizId: quiz.id, filePath, jobId: job?.id },
      {
        attempts: 2,
        removeOnComplete: 50,
        removeOnFail: 100
      }
    );

    return NextResponse.json({ quizId: quiz.id });
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
