import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const subject = searchParams.get('subject');
  const supabase = getSupabaseAdmin();
  let query = supabase.from('quizzes').select('*').eq('is_published', true);
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  if (subject) {
    query = query.eq('subject', subject);
  }
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ quizzes: data || [] });
}
