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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
        <h1>题库广场 / Practice Workspace</h1>
        <p>发布后题库会自动出现在这里。支持检索、按科目筛选、从历史进度继续刷题。</p>
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
          <h2 className="section-title">筛选与搜索</h2>
          <span className="badge">实时筛选</span>
        </div>
        <div className="grid two" style={{ marginTop: 10 }}>
          <input
            className="input"
            placeholder="输入题库名称关键字"
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

      {loading ? (
        <div className="card">正在加载题库...</div>
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
