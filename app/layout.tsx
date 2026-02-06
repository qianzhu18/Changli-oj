import './globals.css';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: '畅理题库',
  description: '题库刷题与管理平台'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <SiteHeader />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
