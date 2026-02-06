'use client';

import { useEffect, useState } from 'react';
import { apiFetch, storeAuth } from '@/lib/client-auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email.trim()) {
      setError('请先输入邮箱');
      return;
    }
    setSending(true);
    setError('');
    setNotice('');
    try {
      const data = await apiFetch<{ ok: boolean; devCode?: string }>('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'register' })
      });
      setCooldown(60);
      const tips = data.devCode
        ? `验证码已发送（开发模式验证码：${data.devCode}）`
        : '验证码已发送，请查收邮箱';
      setNotice(tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim() || !code.trim()) {
      setError('邮箱、密码和验证码不能为空');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await apiFetch<{ token: string; user: { id: string; email: string } }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name, code })
        }
      );
      storeAuth(data.token, data.user);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <h2>创建学习账号</h2>
        <p>注册后可直接进入题库广场，系统会记录你的进度和错题历史。</p>
        <ul>
          <li>支持邮箱快速注册</li>
          <li>数据落地 Supabase</li>
          <li>支持 AI 对话追问（按日限额）</li>
        </ul>
      </aside>
      <div className="card">
        <h2 className="section-title">注册账号</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div>
            <div className="label">昵称</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="label">邮箱</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="label">密码</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <div className="label">邮箱验证码</div>
            <div className="flex">
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="6位数字"
              />
              <button
                type="button"
                className="button secondary"
                onClick={sendCode}
                disabled={sending || cooldown > 0}
              >
                {cooldown > 0 ? `${cooldown}s` : sending ? '发送中' : '发送验证码'}
              </button>
            </div>
          </div>
          {notice && <div className="notice success">{notice}</div>}
          {error && <div className="notice">{error}</div>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
          <p className="muted">
            已有账号？<a href="/login">去登录</a>
          </p>
        </form>
      </div>
    </div>
  );
}
