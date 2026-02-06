'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import Link from 'next/link';

interface WrongQuestion {
  id: string;
  quiz_id: string;
  quiz_title: string;
  question_index: number;
  question_text: string;
  wrong_answer: string;
  correct_answer: string;
  wrong_count: number;
  last_wrong_at: string;
}

export default function WrongQuestionsPage() {
  const [items, setItems] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuiz, setFilterQuiz] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await apiFetch<{ wrongQuestions: WrongQuestion[] }>('/api/wrong-questions');
    setItems(data.wrongQuestions);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const quizzes = Array.from(new Set(items.map((item) => item.quiz_title))).filter(Boolean);
  const filteredItems = filterQuiz ? items.filter((item) => item.quiz_title === filterQuiz) : items;

  const resolve = async (id: string) => {
    await apiFetch(`/api/wrong-questions/${id}`, { method: 'DELETE' });
    await load();
  };

  if (loading) {
    return <div className="card">加载中...</div>;
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 className="section-title">错题本</h2>
        <p className="muted">集中复盘错误题目，支持重新练习。</p>
      </div>
      <div className="card">
        <div className="label">按题库筛选</div>
        <select className="input" value={filterQuiz} onChange={(e) => setFilterQuiz(e.target.value)}>
          <option value="">全部题库</option>
          {quizzes.map((quiz) => (
            <option key={quiz} value={quiz}>
              {quiz}
            </option>
          ))}
        </select>
      </div>
      {filteredItems.length ? (
        <div className="grid" style={{ gap: 12 }}>
          {filteredItems.map((item) => (
            <div key={item.id} className="card">
              <div className="flex space">
                <div>
                  <h3>{item.quiz_title}</h3>
                  <p className="muted">题目 {item.question_index}</p>
                </div>
                <span className="badge">错误 {item.wrong_count} 次</span>
              </div>
              <p style={{ marginTop: 12 }}>{item.question_text}</p>
              <div className="answer-box">
                正确答案：{item.correct_answer || '暂无'}
              </div>
              <p className="muted">
                上次错误：{new Date(item.last_wrong_at).toLocaleString()} · 你的答案：{item.wrong_answer || '未记录'}
              </p>
              <div className="footer-actions">
                <Link className="button" href={`/quiz/${item.quiz_id}?questionIndex=${item.question_index - 1}`}>
                  重新练习
                </Link>
                <button className="button secondary" onClick={() => resolve(item.id)}>
                  已掌握，移除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">暂无错题记录</div>
      )}
    </div>
  );
}
