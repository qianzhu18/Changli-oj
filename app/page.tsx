'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getStoredUser } from '@/lib/client-auth';
import { QuizCard } from '@/components/quiz-card';

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  exam_type?: string | null;
  difficulty?: string | null;
  question_count?: number | null;
  updated_at?: string | null;
}

interface Progress {
  quiz_id: string;
  current_index: number;
  completed_count: number;
}

export default function HomePage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (subject) params.set('subject', subject);
        const data = await apiFetch<{ quizzes: Quiz[] }>(`/api/quizzes?${params.toString()}`);
        setQuizzes(data.quizzes);
        const user = getStoredUser();
        if (user) {
          const progressData = await apiFetch<{ progress: Progress[] }>('/api/progress');
          const map: Record<string, Progress> = {};
          progressData.progress.forEach((item) => {
            map[item.quiz_id] = item;
          });
          setProgress(map);
        } else {
          setProgress({});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载题库失败');
      }
      setLoading(false);
    };
    load();
  }, [search, subject]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((quiz) => {
      if (quiz.subject) set.add(quiz.subject);
    });
    return Array.from(set);
  }, [quizzes]);

  const totalQuestions = useMemo(
    () => quizzes.reduce((sum, quiz) => sum + Number(quiz.question_count || 0), 0),
    [quizzes]
  );

  const continueCount = useMemo(() => Object.keys(progress).length, [progress]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="hero">
        <h1>题库广场</h1>
        <p>按科目检索，按进度续学。每个题库支持错题沉淀与 AI 追问。</p>
        <div className="hero-grid">
          <div className="metric">
            <span className="value">{quizzes.length}</span>
            <div className="label">已发布题库</div>
          </div>
          <div className="metric">
            <span className="value">{totalQuestions}</span>
            <div className="label">题目总量</div>
          </div>
          <div className="metric">
            <span className="value">{continueCount}</span>
            <div className="label">可继续学习</div>
          </div>
        </div>
      </section>

      <div className="card">
        <div className="flex space">
          <h2 className="section-title">筛选条件</h2>
          <span className="badge">实时更新</span>
        </div>
        <div className="grid two" style={{ marginTop: 10 }}>
          <input
            className="input"
            placeholder="搜索题库名称"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">全部科目</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}

      {loading ? (
        <div className="grid two">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="card" key={idx}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-button" />
            </div>
          ))}
        </div>
      ) : quizzes.length ? (
        <div className="grid two">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              id={quiz.id}
              title={quiz.title}
              description={quiz.description}
              subject={quiz.subject}
              examType={quiz.exam_type}
              difficulty={quiz.difficulty}
              questionCount={quiz.question_count}
              updatedAt={quiz.updated_at}
              progress={progress[quiz.id] ? {
                currentIndex: progress[quiz.id].current_index,
                completedCount: progress[quiz.id].completed_count
              } : null}
            />
          ))}
        </div>
      ) : (
        <div className="card empty">暂无题库</div>
      )}
    </div>
  );
}
