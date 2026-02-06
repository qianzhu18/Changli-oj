import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import { verifyEmailVerificationCode } from '@/lib/email-code';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const code = String(body.code || '').trim();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: '请输入邮箱验证码' }, { status: 400 });
    }

    const verifyResult = await verifyEmailVerificationCode(email, 'login', code);
    if (!verifyResult.ok) {
      return NextResponse.json({ error: verifyResult.error }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }
    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }
    if (!data.is_active) {
      return NextResponse.json({ error: '账号已停用，请联系管理员' }, { status: 403 });
    }

    const token = await signToken({ userId: data.id, email: data.email });
    return NextResponse.json({ token, user: { id: data.id, email: data.email } });
  } catch (err) {
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
