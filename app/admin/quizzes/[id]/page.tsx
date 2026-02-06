'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-auth';
import { AdminNav } from '@/components/admin-nav';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface QuizDetail {
  id: string;
  title: string;
  status: string;
  question_count: number;
  is_published: boolean;
  html: string;
  raw_text: string;
  error_msg: string | null;
  description?: string | null;
  subject?: string | null;
  exam_type?: string | null;
  difficulty?: string | null;
}

interface QuestionSummary {
  index: number;
  questionText: string;
  correctAnswer: string;
  explanation: string;
}

export default function AdminQuizEditor({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [html, setHtml] = useState('');
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [mode, setMode] = useState<'html' | 'preview' | 'raw'>('html');
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'verify' | 'explain' | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await apiFetch<{ quiz: QuizDetail }>(`/api/admin/quizzes/${params.id}`);
      setQuiz(data.quiz);
      setHtml(data.quiz.html || '');
      setRawText(data.quiz.raw_text || '');
      setTitle(data.quiz.title || '');
      setDescription(data.quiz.description || '');
      setSubject(data.quiz.subject || '');
      setExamType(data.quiz.exam_type || '');
      setDifficulty(data.quiz.difficulty || '');
      const qs = await apiFetch<{ questions: QuestionSummary[] }>(
        `/api/admin/quizzes/${params.id}/questions`
      );
      setQuestions(qs.questions);
      if (qs.questions.length) {
        setSelectedIndex(qs.questions[0].index);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载失败');
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const saveHtml = async () => {
    try {
      await apiFetch(`/api/admin/quizzes/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ html })
      });
      setMessage('HTML 保存成功');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    }
  };

  const saveRaw = async () => {
    try {
      await apiFetch(`/api/admin/quizzes/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ raw_text: rawText })
      });
      setMessage('原始文本保存成功');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    }
  };

  const saveMeta = async () => {
    try {
      await apiFetch(`/api/admin/quizzes/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          description,
          subject,
          exam_type: examType,
          difficulty
        })
      });
      await load();
      setMessage('元信息更新成功');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失败');
    }
  };

  const reparse = async () => {
    try {
      await apiFetch(`/api/admin/quizzes/${params.id}/reparse`, { method: 'POST' });
      setMessage('已重新进入解析队列');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '重解析失败');
    }
  };

  const currentQuestion = questions.find((q) => q.index === selectedIndex) || questions[0];

  const verifyAnswer = async () => {
    if (!currentQuestion) return;
    setAiLoading(true);
    setAiMode('verify');
    try {
      const data = await apiFetch<{ result: string }>(`/api/admin/ai/verify-answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionText: currentQuestion.questionText,
          answer: currentQuestion.correctAnswer
        })
      });
      setAiResult(data.result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'AI 核实失败');
    } finally {
      setAiLoading(false);
    }
  };

  const completeExplanation = async () => {
    if (!currentQuestion) return;
    setAiLoading(true);
    setAiMode('explain');
    try {
      const data = await apiFetch<{ result: string }>(`/api/admin/ai/complete-explanation`, {
        method: 'POST',
        body: JSON.stringify({
          questionText: currentQuestion.questionText,
          explanation: currentQuestion.explanation
        })
      });
      setAiResult(data.result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'AI 补全失败');
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = async () => {
    if (!currentQuestion || !aiResult) return;
    try {
      await apiFetch(`/api/admin/quizzes/${params.id}/question-update`, {
        method: 'POST',
        body: JSON.stringify({
          index: currentQuestion.index,
          explanation: aiResult
        })
      });
      setMessage('AI 建议已应用');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '应用失败');
    }
  };

  if (!quiz) {
    return <div className="card">加载中...</div>;
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 className="section-title">题库编辑：{quiz.title}</h2>
        {quiz.error_msg && <div className="notice">解析错误：{quiz.error_msg}</div>}
        {message && <div className="notice">{message}</div>}
        <div className="footer-actions">
          <button className="button" onClick={saveHtml}>
            保存 HTML
          </button>
          <button className="button secondary" onClick={saveRaw}>
            保存原始文本
          </button>
          <button className="button secondary" onClick={reparse}>
            重新解析
          </button>
        </div>
      </div>
      <div className="card">
        <h3 className="section-title">题库元信息</h3>
        <div className="form-grid">
          <div>
            <div className="label">标题</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="label">描述</div>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex">
            <div style={{ flex: 1 }}>
              <div className="label">科目</div>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">考试类型</div>
              <input
                className="input"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">难度</div>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">未设置</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
          </div>
          <button className="button" onClick={saveMeta}>
            保存元信息
          </button>
        </div>
      </div>
      <AdminNav />
      <div className="card">
        <div className="flex">
          <button className="button secondary" onClick={() => setMode('html')}>
            HTML 编辑
          </button>
          <button className="button secondary" onClick={() => setMode('preview')}>
            预览
          </button>
          <button className="button secondary" onClick={() => setMode('raw')}>
            纯文本
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          {mode === 'html' && (
            <div className="editor-container">
              <MonacoEditor
                height="420px"
                defaultLanguage="html"
                value={html}
                onChange={(value) => setHtml(value || '')}
              />
            </div>
          )}
          {mode === 'preview' && (
            <iframe
              title="preview"
              style={{ width: '100%', height: 420, border: '1px solid #eee' }}
              srcDoc={html}
            />
          )}
          {mode === 'raw' && (
            <textarea
              className="textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          )}
        </div>
      </div>
      <div className="card">
        <h3 className="section-title">AI 辅助</h3>
        <div className="form-grid">
          <div>
            <div className="label">选择题目</div>
            <select
              className="input"
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
            >
              {questions.map((q) => (
                <option key={q.index} value={q.index}>
                  {q.index}. {q.questionText.slice(0, 20)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex">
            <button className="button" onClick={verifyAnswer} disabled={aiLoading}>
              AI 核实答案
            </button>
            <button className="button secondary" onClick={completeExplanation} disabled={aiLoading}>
              AI 补全解析
            </button>
          </div>
          {aiResult && (
            <div className="notice">
              <div style={{ marginBottom: 8 }}>{aiResult}</div>
              {aiMode === 'explain' && (
                <button className="button" onClick={applySuggestion}>
                  应用为解析内容
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
