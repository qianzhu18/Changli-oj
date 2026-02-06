'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import { AdminNav } from '@/components/admin-nav';

interface StatDetail {
  totalUsers: number;
  totalQuizzes: number;
  totalQuestions: number;
  totalAttempts: number;
  topQuizzes: { title: string; attempts: number }[];
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ stats: StatDetail }>('/api/admin/stats/detail')
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err instanceof Error ? err.message : '加载统计失败'));
  }, []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero">
        <h1>数据统计 / Analytics</h1>
        <p>追踪整体题库规模、刷题活跃度和热门题库，辅助内容迭代。</p>
      </section>
      <AdminNav />
      {error && <div className="notice">{error}</div>}
      {stats ? (
        <div className="grid" style={{ gap: 16 }}>
          <div className="grid three">
            <div className="card">
              <p className="muted">用户总数</p>
              <p className="section-title">{stats.totalUsers}</p>
            </div>
            <div className="card">
              <p className="muted">题库总数</p>
              <p className="section-title">{stats.totalQuizzes}</p>
            </div>
            <div className="card">
              <p className="muted">题目总数</p>
              <p className="section-title">{stats.totalQuestions}</p>
            </div>
            <div className="card">
              <p className="muted">刷题次数</p>
              <p className="section-title">{stats.totalAttempts}</p>
            </div>
          </div>
          <div className="card">
            <h3>热门题库 Top10</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>题库</th>
                  <th>刷题次数</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQuizzes.map((item) => (
                  <tr key={item.title}>
                    <td>{item.title}</td>
                    <td>{item.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">加载统计中...</div>
      )}
    </div>
  );
}
