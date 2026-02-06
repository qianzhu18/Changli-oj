import Link from 'next/link';

export interface QuizCardProps {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  examType?: string | null;
  difficulty?: string | null;
  questionCount?: number | null;
  updatedAt?: string | null;
  progress?: { currentIndex: number; completedCount: number } | null;
}

export function QuizCard(props: QuizCardProps) {
  const updated = props.updatedAt ? new Date(props.updatedAt).toLocaleDateString() : '-';
  const difficultyLabel = props.difficulty || '未标注';
  const progressRate =
    props.progress && props.questionCount
      ? Math.min(100, Math.round((props.progress.completedCount / Number(props.questionCount || 1)) * 100))
      : 0;

  return (
    <article className="card quiz-card">
      <div className="quiz-card-head">
        <div className="quiz-card-title-wrap">
          <h3 className="quiz-card-title">{props.title}</h3>
          <p className="muted">{props.description || '暂无描述'}</p>
        </div>
        <span className="badge difficulty-chip">
          <span className="difficulty-dot" />
          {difficultyLabel}
        </span>
      </div>
      <div className="pill-list" style={{ marginTop: 12 }}>
        {props.subject && <span className="tag">{props.subject}</span>}
        {props.examType && <span className="tag">{props.examType}</span>}
        <span className="tag">题量 {props.questionCount ?? 0}</span>
        <span className="tag">更新 {updated}</span>
      </div>
      <div className="progress-bar" style={{ marginTop: 16 }}>
        <div style={{ width: `${progressRate}%` }} />
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        {props.progress
          ? `已完成 ${props.progress.completedCount} 题 · 当前第 ${props.progress.currentIndex + 1} 题`
          : '尚未开始，支持断点续学'}
      </p>
      <div className="footer-actions">
        {props.progress ? (
          <Link className="button accent" href={`/quiz/${props.id}?continue=true`}>
            继续刷题（{props.progress.currentIndex + 1}/{props.questionCount ?? 0}）
          </Link>
        ) : (
          <Link className="button" href={`/quiz/${props.id}`}>
            开始刷题
          </Link>
        )}
      </div>
    </article>
  );
}
