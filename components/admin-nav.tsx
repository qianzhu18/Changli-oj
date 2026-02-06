'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: '概览' },
  { href: '/admin/quizzes', label: '题库管理' },
  { href: '/admin/reports', label: '报错反馈' },
  { href: '/admin/stats', label: '数据统计' }
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="nav-tabs">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'active' : ''}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
