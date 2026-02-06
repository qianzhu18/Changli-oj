'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch, getStoredUser } from '@/lib/client-auth';

interface Quiz {
  id: string;
  title: string;
  question_count: number;
}

interface Question {
  index: number;
  type: 'choice' | 'fill' | 'essay';
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [fillAnswer, setFillAnswer] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ConversationMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('答案错误');
  const [reportDesc, setReportDesc] = useState('');

  const total = quiz?.question_count || 0;

  const loadQuestion = async (index: number, fromProgress?: boolean) => {
    setLoading(true);
    const data = await apiFetch<{ quiz: Quiz }>(`/api/quizzes/${params.id}`);
    setQuiz(data.quiz);
    const questionData = await apiFetch<{ question: Question }>(
      `/api/quizzes/${params.id}/questions/${index}`
    );
    setQuestion(questionData.question);
    setCurrentIndex(index);
    setShowAnswer(false);
    setSelectedOption('');
    setFillAnswer('');
    if (fromProgress) {
      setShowAnswer(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const directIndex = searchParams.get('questionIndex');
      if (directIndex) {
        await loadQuestion(Number(directIndex));
        return;
      }
      const continueFlag = searchParams.get('continue');
      if (continueFlag) {
        try {
          const progress = await apiFetch<{ progress: { current_index: number } }>(
            `/api/progress?quizId=${params.id}`
          );
          await loadQuestion(progress.progress.current_index || 0, true);
          return;
        } catch {
          // ignore
        }
      }
      await loadQuestion(0);
    };
    init();
  }, [params.id, searchParams]);

  const handleSubmit = async (isCorrectOverride?: boolean) => {
    if (!question) return;
    const user = getStoredUser();
    if (!user) {
      alert('请先登录');
      window.location.href = '/login';
      return;
    }
    const userAnswer = question.type === 'choice' ? selectedOption : fillAnswer;
    if (question.type === 'choice' && !selectedOption) {
      alert('请选择答案');
      return;
    }
    if (question.type === 'fill' && !fillAnswer.trim()) {
      alert('请输入答案');
      return;
    }
    const isCorrect =
      typeof isCorrectOverride === 'boolean'
        ? isCorrectOverride
        : question.type === 'essay'
        ? false
        : userAnswer.trim() === question.correctAnswer.trim();

    await apiFetch('/api/progress', {
      method: 'POST',
      body: JSON.stringify({
        quizId: params.id,
        questionIndex: question.index - 1,
        isCorrect,
        userAnswer
      })
    });

    setShowAnswer(true);
    if (currentIndex + 1 < total) {
      setTimeout(() => {
        loadQuestion(currentIndex + 1);
      }, 800);
    }
  };

  const openAi = async () => {
    if (!question) return;
    try {
      const data = await apiFetch<{ conversationId: string; messages: ConversationMessage[] }>(
        '/api/ai/conversations',
        {
          method: 'POST',
          body: JSON.stringify({
            quizId: params.id,
            questionIndex: question.index,
            questionText: question.questionText,
            explanation: question.explanation
          })
        }
      );
      setConversationId(data.conversationId);
      setAiMessages(data.messages);
      setAiOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建对话失败');
    }
  };

  const sendAi = async () => {
    if (!aiInput.trim() || !conversationId) return;
    setAiLoading(true);
    try {
      const data = await apiFetch<{ messages: ConversationMessage[] }>(
        '/api/ai/chat',
        {
          method: 'POST',
          body: JSON.stringify({ conversationId, message: aiInput })
        }
      );
      setAiMessages(data.messages);
      setAiInput('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '发送失败');
    } finally {
      setAiLoading(false);
    }
  };

  const submitReport = async () => {
    if (!question) return;
    await apiFetch('/api/error-reports', {
      method: 'POST',
      body: JSON.stringify({
        quizId: params.id,
        questionIndex: question.index,
        errorType: reportType,
        description: reportDesc
      })
    });
    setReportOpen(false);
    setReportDesc('');
    alert('报错已提交');
  };

  const progressText = useMemo(() => {
    if (!total) return '0/0';
    return `${currentIndex + 1}/${total}`;
  }, [currentIndex, total]);

  if (loading || !quiz || !question) {
    return <div className="card">加载中...</div>;
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div className="flex space">
          <div>
            <h2 className="section-title">{quiz.title}</h2>
            <p className="muted">当前进度：{progressText}</p>
          </div>
          <div className="flex">
            <button className="button secondary" onClick={() => setReportOpen(true)}>
              报错
            </button>
            <button className="button accent" onClick={openAi}>
              AI 追问
            </button>
          </div>
        </div>
      </div>

      <div className="split-layout">
        <div className="card">
          <h3 className="section-title">题目</h3>
          <p onClick={() => setShowAnswer(true)} style={{ cursor: 'pointer' }}>
            {question.questionText}
          </p>
          {question.options && (
            <ul className="option-list" style={{ marginTop: 16 }}>
              {question.options.map((opt, idx) => {
                const key = String.fromCharCode(65 + idx);
                return (
                  <li
                    key={key}
                    className={`option ${selectedOption === key ? 'selected' : ''}`}
                    onClick={() => setSelectedOption(key)}
                  >
                    <strong>{key}.</strong> {opt}
                  </li>
                );
              })}
            </ul>
          )}
          {question.type === 'fill' && (
            <div style={{ marginTop: 12 }}>
              <div className="label">你的答案</div>
              <input
                className="input"
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
              />
            </div>
          )}
          {question.type === 'essay' && (
            <div style={{ marginTop: 12 }} className="notice">
              大题请自评。
            </div>
          )}
          <div className="footer-actions">
            <button
              className="button secondary"
              onClick={() => currentIndex > 0 && loadQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              上一题
            </button>
            {question.type === 'essay' ? (
              <>
                <button className="button" onClick={() => handleSubmit(true)}>
                  我答对了
                </button>
                <button className="button secondary" onClick={() => handleSubmit(false)}>
                  我答错了
                </button>
              </>
            ) : (
              <button className="button" onClick={() => handleSubmit()}>
                提交并查看解析
              </button>
            )}
            <button
              className="button secondary"
              onClick={() => currentIndex + 1 < total && loadQuestion(currentIndex + 1)}
              disabled={currentIndex + 1 >= total}
            >
              下一题
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">答案与解析</h3>
          {showAnswer ? (
            <>
              <div className="answer-box">
                正确答案：{question.correctAnswer || '暂无答案'}
              </div>
              <div style={{ marginTop: 12 }}>{question.explanation}</div>
            </>
          ) : (
            <div className="muted">提交后显示答案与解析。</div>
          )}
        </div>
      </div>

      {aiOpen && (
        <div className="modal-overlay" onClick={() => setAiOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex space">
              <h3 className="section-title">AI 追问</h3>
              <button className="button secondary" onClick={() => setAiOpen(false)}>
                关闭
              </button>
            </div>
            <div className="grid" style={{ gap: 12, marginTop: 12 }}>
              <div className="notice">
                <strong>题目：</strong> {question.questionText}
                <br />
                <strong>解析：</strong> {question.explanation}
              </div>
              <div className="card" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {aiMessages.map((msg, idx) => (
                  <p key={idx} style={{ marginBottom: 8 }}>
                    <strong>{msg.role === 'user' ? '你' : 'AI'}：</strong> {msg.content}
                  </p>
                ))}
              </div>
              <div className="flex" style={{ alignItems: 'flex-end' }}>
                <textarea
                  className="textarea"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                />
                <button className="button accent" onClick={sendAi} disabled={aiLoading}>
                  {aiLoading ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="modal-overlay" onClick={() => setReportOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex space">
              <h3 className="section-title">题目报错</h3>
              <button className="button secondary" onClick={() => setReportOpen(false)}>
                关闭
              </button>
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <div>
                <div className="label">错误类型</div>
                <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="答案错误">答案错误</option>
                  <option value="解析错误">解析错误</option>
                  <option value="题干有误">题干有误</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <div className="label">描述</div>
                <textarea
                  className="textarea"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                />
              </div>
              <button className="button" onClick={submitReport}>
                提交报错
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
