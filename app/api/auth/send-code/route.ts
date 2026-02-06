import { NextRequest, NextResponse } from 'next/server';
import { createEmailVerificationCode, EmailCodePurpose } from '@/lib/email-code';
import { getMailServiceState, sendVerificationCodeEmail } from '@/lib/mailer';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const purpose = String(body.purpose || '') as EmailCodePurpose;

    if (!email || !purpose) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    if (!['register', 'login'].includes(purpose)) {
      return NextResponse.json({ error: '验证码用途不支持' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (purpose === 'register' && existingUser) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
    }
    if (purpose === 'login' && !existingUser) {
      return NextResponse.json({ error: '该邮箱尚未注册' }, { status: 400 });
    }

    const mailState = getMailServiceState();
    if (!mailState.ready) {
      return NextResponse.json({ error: mailState.error }, { status: 500 });
    }

    const created = await createEmailVerificationCode(email, purpose);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 429 });
    }

    await sendVerificationCodeEmail(email, created.code);

    return NextResponse.json({
      ok: true,
      expiresAt: created.expiresAt
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '发送验证码失败' },
      { status: 500 }
    );
  }
}
