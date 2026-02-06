'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredUser, logout } from '@/lib/client-auth';

export function SiteHeader() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const pathname = usePathname();
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/auth');

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (isAuthPage) {
    return (
      <header className="header auth-header">
        <div className="header-inner">
          <Link className="logo" href="/">
            畅理题库
          </Link>
          <div className="header-links">
            <Link href="/">返回题库广场</Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link className="logo" href="/">
          畅理题库
        </Link>
        <div className="header-links">
          <Link href="/" className={pathname === '/' ? 'tag' : ''}>
            题库广场
          </Link>
          <Link href="/wrong-questions" className={pathname.startsWith('/wrong-questions') ? 'tag' : ''}>
            错题本
          </Link>
          <Link href="/admin" className={pathname.startsWith('/admin') ? 'tag' : ''}>
            管理面板
          </Link>
          {user ? (
            <button
              className="button secondary small-button"
              onClick={() => {
                logout();
                setUser(null);
              }}
            >
              退出登录
            </button>
          ) : (
            <>
              <Link href="/login">登录</Link>
              <Link href="/register">注册</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
