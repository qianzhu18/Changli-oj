'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import { AdminNav } from '@/components/admin-nav';
import Link from 'next/link';

interface Stats {
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  failedQuizzes: number;
  pendingReports: number;
  parseSuccessRate: number;
}

interface QuizItem {
  id: string;
  title: string;
  status: string;
  question_count: number;
  parse_progress: number;
  updated_at: string;
  is_published: boolean;
}

interface StatsResponse {
  stats: Stats;
}

interface QuizListResponse {
  quizzes: QuizItem[];
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [publishQueue, setPublishQueue] = useState<QuizItem[]>([]);
  const [processingQueue, setProcessingQueue] = useState<QuizItem[]>([]);
  const [failedQueue, setFailedQueue] = useState<QuizItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const statsRes: StatsResponse = await apiFetch('/api/admin/stats');
      const completedRes: QuizListResponse = await apiFetch('/api/admin/quizzes?status=completed');
      const processingRes: QuizListResponse = await apiFetch('/api/admin/quizzes?status=processing');
      const failedRes: QuizListResponse = await apiFetch('/api/admin/quizzes?status=failed');
      setStats(statsRes.stats);
      setPublishQueue(completedRes.quizzes.filter((quiz) => !quiz.is_published).slice(0, 8));
      setProcessingQueue(processingRes.quizzes.slice(0, 8));
      setFailedQueue(failedRes.quizzes.slice(0, 8));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载管理面板失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (id: string, publish: boolean) => {
    setMessage('');
    try {
      await apiFetch(`/api/admin/quizzes/${id}/${publish ? 'publish' : 'unpublish'}`, {
        method: 'POST'
      });
      setMessage(publish ? '发布成功' : '下架成功');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '发布操作失败');
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero">
        <h1>管理面板 / Content Operations</h1>
        <p>上传后自动解析，审核后发布。这里提供待发布、解析中、失败题库的快速入口。</p>
      </section>
      <AdminNav />
      {message && <div className="notice">{message}</div>}
      {stats ? (
        <div className="grid three">
          <div className="card">
            <p className="muted">题库总数</p>
            <p className="section-title">{stats.totalQuizzes}</p>
          </div>
          <div className="card">
            <p className="muted">已发布</p>
            <p className="section-title">{stats.publishedQuizzes}</p>
          </div>
          <div className="card">
            <p className="muted">草稿/失败</p>
            <p className="section-title">
              {stats.draftQuizzes} / {stats.failedQuizzes}
            </p>
          </div>
          <div className="card">
            <p className="muted">解析成功率</p>
            <p className="section-title">{(stats.parseSuccessRate * 100).toFixed(1)}%</p>
          </div>
          <div className="card">
            <p className="muted">待处理报错</p>
            <p className="section-title">{stats.pendingReports}</p>
          </div>
        </div>
      ) : (
        <div className="card">{loading ? '加载统计中...' : '统计加载失败'}</div>
      )}
      <div className="grid two">
        <div className="card">
          <div className="flex space">
            <h3 className="section-title">待发布题库</h3>
            <Link className="button secondary" href="/admin/quizzes">
              去题库管理
            </Link>
          </div>
          {publishQueue.length ? (
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>题库</th>
                  <th>题量</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {publishQueue.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>{quiz.title}</td>
                    <td>{quiz.question_count}</td>
                    <td>{new Date(quiz.updated_at).toLocaleString()}</td>
                    <td>
                      <div className="flex">
                        <Link className="button secondary" href={`/admin/quizzes/${quiz.id}`}>
                          编辑
                        </Link>
                        <button className="button" onClick={() => togglePublish(quiz.id, true)}>
                          发布
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">当前没有待发布题库</div>
          )}
        </div>
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <h3 className="section-title">解析进行中</h3>
            {processingQueue.length ? (
              <div className="grid">
                {processingQueue.map((quiz) => (
                  <div key={quiz.id} className="card" style={{ padding: 12 }}>
                    <div className="flex space">
                      <strong>{quiz.title}</strong>
                      <span className="badge">{quiz.parse_progress || 0}%</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 8 }}>
                      <div style={{ width: `${quiz.parse_progress || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">没有解析中的题库</div>
            )}
          </div>
          <div className="card">
            <h3 className="section-title">解析失败待修复</h3>
            {failedQueue.length ? (
              <div className="grid">
                {failedQueue.map((quiz) => (
                  <div key={quiz.id} className="flex space">
                    <span>{quiz.title}</span>
                    <Link className="button secondary" href={`/admin/quizzes/${quiz.id}`}>
                      去修复
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">没有解析失败题库</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
