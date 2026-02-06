'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import { AdminNav } from '@/components/admin-nav';
import Link from 'next/link';

interface Report {
  id: string;
  quiz_id: string;
  quiz_title: string;
  question_index: number;
  error_type: string;
  description: string;
  status: string;
  admin_note?: string | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const data = await apiFetch<{ reports: Report[] }>('/api/admin/error-reports');
      setReports(data.reports);
      const initialNotes: Record<string, string> = {};
      data.reports.forEach((report) => {
        if (report.admin_note) {
          initialNotes[report.id] = report.admin_note;
        }
      });
      setNotes(initialNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载报错列表失败');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/admin/error-reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  const saveNote = async (id: string) => {
    try {
      await apiFetch(`/api/admin/error-reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_note: notes[id] || '' })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存备注失败');
    }
  };

  const statusClass = (status: string) => {
    if (status === 'resolved') return 'completed';
    if (status === 'ignored') return 'failed';
    return 'pending';
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero">
        <h1>报错反馈 / Triage</h1>
        <p>学员反馈统一在这里处理。可以跳转到题目编辑页直接修复并写处理备注。</p>
      </section>
      <AdminNav />
      {error && <div className="notice">{error}</div>}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>题库</th>
              <th>题号</th>
              <th>类型</th>
              <th>描述</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.quiz_title}</td>
                <td>{report.question_index}</td>
                <td>{report.error_type}</td>
                <td>{report.description}</td>
                <td>
                  <span className={`status-chip ${statusClass(report.status)}`}>{report.status}</span>
                </td>
                <td>
                  <div className="flex">
                    <Link className="button secondary" href={`/admin/quizzes/${report.quiz_id}`}>
                      修复
                    </Link>
                    <button className="button" onClick={() => updateStatus(report.id, 'resolved')}>
                      已处理
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => updateStatus(report.id, 'ignored')}
                    >
                      忽略
                    </button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      className="input"
                      placeholder="管理员备注"
                      value={notes[report.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [report.id]: e.target.value })}
                    />
                    <button className="button secondary" onClick={() => saveNote(report.id)}>
                      保存备注
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reports.length && <div className="empty">目前没有新的报错记录。</div>}
      </div>
    </div>
  );
}
