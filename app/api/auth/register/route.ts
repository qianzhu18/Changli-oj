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
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: '请输入邮箱验证码' }, { status: 400 });
    }

    const verifyResult = await verifyEmailVerificationCode(email, 'register', code);
    if (!verifyResult.ok) {
      return NextResponse.json({ error: verifyResult.error }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash, name })
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const token = await signToken({ userId: data.id, email: data.email });
    return NextResponse.json({ token, user: data });
  } catch (err) {
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
