import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('error_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ reports: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
