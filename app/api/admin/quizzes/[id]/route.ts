import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('quizzes').select('*').eq('id', params.id).single();
    if (error || !data) {
      return NextResponse.json({ error: '题库不存在' }, { status: 404 });
    }
    return NextResponse.json({ quiz: data });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
  const body = await req.json();
  const payload: Record<string, unknown> = {};
  if (typeof body.html === 'string') payload.html = body.html;
  if (typeof body.raw_text === 'string') payload.raw_text = body.raw_text;
  if (typeof body.title === 'string') payload.title = body.title;
  if (typeof body.description === 'string') payload.description = body.description;
  if (typeof body.subject === 'string') payload.subject = body.subject;
  if (typeof body.exam_type === 'string') payload.exam_type = body.exam_type;
  if (typeof body.difficulty === 'string') payload.difficulty = body.difficulty;
    payload.updated_at = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('quizzes').update(payload).eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
