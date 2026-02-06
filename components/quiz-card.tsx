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
  return (
    <div className="card">
      <div className="flex space">
        <div>
          <h3 className="section-title">{props.title}</h3>
          <p className="muted">{props.description || '暂无描述'}</p>
        </div>
        <span className="badge">{props.difficulty || '未知难度'}</span>
      </div>
      <div className="pill-list" style={{ marginTop: 12 }}>
        {props.subject && <span className="tag">{props.subject}</span>}
        {props.examType && <span className="tag">{props.examType}</span>}
        <span className="tag">题量 {props.questionCount ?? 0}</span>
        <span className="tag">更新 {updated}</span>
      </div>
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
    </div>
  );
}
