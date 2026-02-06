'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import { AdminNav } from '@/components/admin-nav';
import Link from 'next/link';

interface Quiz {
  id: string;
  title: string;
  status: string;
  question_count: number;
  updated_at: string;
  parse_progress: number;
  is_published: boolean;
  parse_mode?: string | null;
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      const data = await apiFetch<{ quizzes: Quiz[] }>(`/api/admin/quizzes?${params.toString()}`);
      setQuizzes(data.quizzes);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载题库失败');
    }
  };

  useEffect(() => {
    load();
  }, [status, search]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage('');
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('changli_token') || ''}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      const response = await new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            try {
              const payload = JSON.parse(xhr.responseText);
              reject(new Error(payload.error || '上传失败'));
            } catch {
              reject(new Error(xhr.responseText || '上传失败'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('上传失败'));
        xhr.send(formData);
      });
      if (response) {
        await load();
        setMessage('上传成功，已进入解析队列。');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const togglePublish = async (id: string, publish: boolean) => {
    try {
      await apiFetch(`/api/admin/quizzes/${id}/${publish ? 'publish' : 'unpublish'}`, {
        method: 'POST'
      });
      await load();
      setMessage(publish ? '题库已发布' : '题库已下架');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '操作失败');
    }
  };

  const statusClass = (value: string) => {
    if (value === 'completed') return 'completed';
    if (value === 'processing') return 'processing';
    if (value === 'failed') return 'failed';
    return 'pending';
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero">
        <h1>题库流水线</h1>
        <p>上传 TXT/MD 后进入自动解析，失败可重试并人工修复。</p>
      </section>
      <div className="card">
        <div className="flex space">
          <h2 className="section-title">上传题库</h2>
          <span className="badge">最大 10MB</span>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input
            type="file"
            accept=".txt,.md"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading && (
            <div className="progress-bar">
              <div style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {message && <div className="notice">{message}</div>}
        </div>
      </div>
      <AdminNav />
      <div className="card">
        <div className="flex" style={{ flexWrap: 'wrap' }}>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="pending">待解析</option>
            <option value="processing">解析中</option>
            <option value="completed">已完成</option>
            <option value="failed">解析失败</option>
          </select>
          <input
            className="input"
            placeholder="搜索题库名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>题库名称</th>
              <th>状态</th>
              <th>题量</th>
              <th>进度</th>
              <th>解析来源</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td>{quiz.title}</td>
                <td>
                  <span className={`status-chip ${statusClass(quiz.status)}`}>{quiz.status}</span>
                </td>
                <td>{quiz.question_count}</td>
                <td>
                  <div className="progress-bar">
                    <div style={{ width: `${quiz.parse_progress || 0}%` }} />
                  </div>
                </td>
                <td>
                  <span className="badge">{quiz.parse_mode === 'ai' ? 'AI' : '规则'}</span>
                </td>
                <td>{new Date(quiz.updated_at).toLocaleDateString()}</td>
                <td>
                  <div className="flex">
                    <Link className="button secondary" href={`/admin/quizzes/${quiz.id}`}>
                      编辑
                    </Link>
                    {quiz.is_published ? (
                      <button
                        className="button secondary"
                        onClick={() => togglePublish(quiz.id, false)}
                      >
                        下架
                      </button>
                    ) : (
                      <button className="button" onClick={() => togglePublish(quiz.id, true)}>
                        发布
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!quizzes.length && <div className="empty">当前没有符合条件的题库。</div>}
      </div>
    </div>
  );
}
