import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';

export type EmailCodePurpose = 'register' | 'login';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidCode(code: string) {
  return /^\d{6}$/.test(code);
}

function isMissingCodeTableError(message: string | null | undefined) {
  if (!message) return false;
  return (
    message.includes("public.email_verification_codes") ||
    message.includes('email_verification_codes')
  );
}

function fallbackType(purpose: EmailCodePurpose) {
  return `email_code_${purpose}`;
}

export async function createEmailVerificationCode(email: string, purpose: EmailCodePurpose) {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const { data: latest, error: latestError } = await supabase
    .from('email_verification_codes')
    .select('id, created_at, consumed_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError && isMissingCodeTableError(latestError.message)) {
    return createEmailVerificationCodeInJobs(email, purpose, now);
  }

  if (latest?.created_at) {
    const lastAt = new Date(latest.created_at).getTime();
    if (Date.now() - lastAt < 60 * 1000) {
      return { ok: false as const, error: '验证码发送过于频繁，请稍后再试' };
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from('email_verification_codes').insert({
    email,
    purpose,
    code_hash: codeHash,
    expires_at: expiresAt
  });

  if (error && isMissingCodeTableError(error.message)) {
    return createEmailVerificationCodeInJobs(email, purpose, now);
  }
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    code,
    expiresAt
  };
}

export async function verifyEmailVerificationCode(
  email: string,
  purpose: EmailCodePurpose,
  code: string
) {
  if (!isValidCode(code)) {
    return { ok: false as const, error: '验证码格式错误' };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('id, code_hash, expires_at, try_count')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingCodeTableError(error.message)) {
    return verifyEmailVerificationCodeInJobs(email, purpose, code);
  }
  if (error || !data) {
    return { ok: false as const, error: '请先获取验证码' };
  }

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) {
    await supabase
      .from('email_verification_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', data.id);
    return { ok: false as const, error: '验证码已过期，请重新获取' };
  }

  const match = await bcrypt.compare(code, data.code_hash);
  if (!match) {
    const nextTry = (data.try_count || 0) + 1;
    const payload: Record<string, unknown> = { try_count: nextTry };
    if (nextTry >= 5) {
      payload.consumed_at = new Date().toISOString();
    }
    await supabase.from('email_verification_codes').update(payload).eq('id', data.id);
    return { ok: false as const, error: '验证码错误' };
  }

  await supabase
    .from('email_verification_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', data.id);

  return { ok: true as const };
}

async function createEmailVerificationCodeInJobs(
  email: string,
  purpose: EmailCodePurpose,
  now: Date
) {
  const supabase = getSupabaseAdmin();
  const { data: latest } = await supabase
    .from('jobs')
    .select('id, created_at, data')
    .eq('type', fallbackType(purpose))
    .eq('status', 'pending')
    .contains('data', { email })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at) {
    const lastAt = new Date(latest.created_at).getTime();
    if (Date.now() - lastAt < 60 * 1000) {
      return { ok: false as const, error: '验证码发送过于频繁，请稍后再试' };
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from('jobs').insert({
    type: fallbackType(purpose),
    status: 'pending',
    progress: 0,
    data: {
      email,
      purpose,
      codeHash,
      expiresAt,
      tryCount: 0
    }
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    code,
    expiresAt
  };
}

async function verifyEmailVerificationCodeInJobs(
  email: string,
  purpose: EmailCodePurpose,
  code: string
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, data, status')
    .eq('type', fallbackType(purpose))
    .eq('status', 'pending')
    .contains('data', { email })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: '请先获取验证码' };
  }

  const payload = (data.data || {}) as {
    codeHash?: string;
    expiresAt?: string;
    tryCount?: number;
  };
  const codeHash = String(payload.codeHash || '');
  const expiresAt = String(payload.expiresAt || '');
  const tryCount = Number(payload.tryCount || 0);

  if (!codeHash || !expiresAt) {
    return { ok: false as const, error: '验证码记录异常，请重新获取' };
  }
  if (Date.now() > new Date(expiresAt).getTime()) {
    await supabase.from('jobs').update({ status: 'failed', progress: 100 }).eq('id', data.id);
    return { ok: false as const, error: '验证码已过期，请重新获取' };
  }

  const matched = await bcrypt.compare(code, codeHash);
  if (!matched) {
    const nextTry = tryCount + 1;
    await supabase
      .from('jobs')
      .update({
        status: nextTry >= 5 ? 'failed' : 'pending',
        data: { ...payload, tryCount: nextTry }
      })
      .eq('id', data.id);
    return { ok: false as const, error: '验证码错误' };
  }

  await supabase
    .from('jobs')
    .update({
      status: 'completed',
      progress: 100,
      result: { consumedAt: new Date().toISOString() }
    })
    .eq('id', data.id);
  return { ok: true as const };
}
