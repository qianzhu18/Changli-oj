'use client';

import { useEffect, useState } from 'react';
import { apiFetch, storeAuth } from '@/lib/client-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ email, purpose: 'login' })
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
      setError('请输入邮箱、密码和验证码');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await apiFetch<{ token: string; user: { id: string; email: string } }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, code })
        }
      );
      storeAuth(data.token, data.user);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <h2>欢迎回来</h2>
        <p>登录后可同步进度、记录错题并使用 AI 追问能力。</p>
        <ul>
          <li>JWT 会话有效期 7 天</li>
          <li>自动保存刷题进度</li>
          <li>错题本和报错记录跨设备同步</li>
        </ul>
      </aside>
      <div className="card">
        <h2 className="section-title">登录账号</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
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
            {loading ? '登录中...' : '登录'}
          </button>
          <p className="muted">
            还没有账号？<a href="/register">立即注册</a>
          </p>
        </form>
      </div>
    </div>
  );
}
