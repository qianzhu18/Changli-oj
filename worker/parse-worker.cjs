const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs/promises');

function normalize(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectBlocks(raw) {
  const cleaned = normalize(raw);
  if (!cleaned) return [];
  const parts = cleaned
    .split(/\n(?=(?:\d{1,3}[\.、]|Q\d+|题\d+)[\s\S]*)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [cleaned];
}

function parseBlock(block, index) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  let questionText = '';
  const options = [];
  let correctAnswer = '';
  let explanation = '';

  for (const line of lines) {
    if (/^(?:答案|正确答案|Answer)[:：]/i.test(line)) {
      correctAnswer = line.replace(/^(?:答案|正确答案|Answer)[:：]\s*/i, '').trim();
      continue;
    }
    if (/^(?:解析|Explanation)[:：]/i.test(line)) {
      explanation = line.replace(/^(?:解析|Explanation)[:：]\s*/i, '').trim();
      continue;
    }
    if (/^[A-D][\.|、\)]\s*/.test(line)) {
      options.push(line.replace(/^[A-D][\.|、\)]\s*/, '').trim());
      continue;
    }
    if (!questionText) {
      questionText = line.replace(/^(?:\d{1,3}[\.、]|Q\d+|题\d+)\s*/, '').trim();
    } else if (!explanation) {
      explanation = explanation ? `${explanation}\n${line}` : line;
    }
  }

  const type = options.length
    ? 'choice'
    : questionText.includes('____') || questionText.includes('（  ）')
      ? 'fill'
      : 'essay';

  return {
    index,
    type,
    questionText: questionText || `题目 ${index}`,
    options: options.length ? options : undefined,
    correctAnswer: correctAnswer || (type === 'essay' ? '参考答案' : ''),
    explanation: explanation || '暂无解析。'
  };
}

function parseRawToQuestions(raw) {
  const blocks = detectBlocks(raw);
  return blocks.map((block, idx) => parseBlock(block, idx + 1));
}

function questionsToHtml(questions) {
  const items = questions
    .map((q) => {
      const optionsHtml = q.options
        ? `<ul class=\"options\">${q.options
            .map((opt, idx) => {
              const key = String.fromCharCode(65 + idx);
              return `<li data-key=\"${key}\">${escapeHtml(opt)}</li>`;
            })
            .join('')}</ul>`
        : '';
      return `
        <div class=\"question\" data-index=\"${q.index}\" data-type=\"${q.type}\">
          <div class=\"question-text\">${escapeHtml(q.questionText)}</div>
          ${optionsHtml}
          <div class=\"answer\">${escapeHtml(q.correctAnswer)}</div>
          <div class=\"explanation\">${escapeHtml(q.explanation)}</div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"UTF-8\" />
  <title>题库</title>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    .question { border-bottom: 1px solid #eee; padding: 16px 0; }
    .question-text { font-weight: 600; margin-bottom: 8px; }
    .options { margin: 8px 0; padding-left: 18px; }
    .answer { color: #d96b27; margin-top: 8px; }
    .explanation { color: #555; margin-top: 6px; }
  </style>
</head>
<body>
  ${items}
</body>
</html>`;
}

function normalizeAiQuestion(item, idx) {
  const options = Array.isArray(item.options)
    ? item.options.map((v) => String(v || '').trim()).filter(Boolean)
    : undefined;

  const typeRaw = String(item.type || '').toLowerCase();
  const type =
    typeRaw === 'choice' || typeRaw === 'fill' || typeRaw === 'essay'
      ? typeRaw
      : options && options.length
        ? 'choice'
        : 'essay';

  return {
    index: idx + 1,
    type,
    questionText: String(item.questionText || item.question || '').trim() || `题目 ${idx + 1}`,
    options: options && options.length ? options : undefined,
    correctAnswer: String(item.correctAnswer || item.answer || '').trim() || '参考答案',
    explanation: String(item.explanation || item.analysis || '').trim() || '暂无解析。'
  };
}

function extractJson(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('AI 返回为空');
  const fenced = cleaned.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const generic = cleaned.match(/```([\s\S]*?)```/);
  if (generic?.[1]) return generic[1].trim();
  const startObj = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  const start =
    startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
  if (start === -1) return cleaned;
  const endObj = cleaned.lastIndexOf('}');
  const endArr = cleaned.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (end === -1 || end < start) return cleaned.slice(start).trim();
  return cleaned.slice(start, end + 1).trim();
}

async function parseWithGemini(rawText) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;

  const prompt = `你是题库结构化解析助手。请将输入文本解析成 JSON。
要求：
1) 返回纯 JSON，不要返回 markdown。
2) 顶层结构：{"questions":[...]}
3) 每题字段：type(choice|fill|essay), questionText, options(可选数组), correctAnswer, explanation。
4) 若无法完整识别，也必须尽可能提取题目并补齐 explanation。

输入文本：
${rawText}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini 请求失败: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  const jsonText = extractJson(text);
  const parsed = JSON.parse(jsonText);
  const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;

  if (!Array.isArray(rawQuestions) || !rawQuestions.length) {
    throw new Error('AI 未返回有效题目数组');
  }

  const questions = rawQuestions.map((item, idx) => normalizeAiQuestion(item || {}, idx));
  return questions.filter((q) => q.questionText);
}

async function updateQuiz(quizId, payload) {
  await supabase.from('quizzes').update(payload).eq('id', quizId);
}

async function updateJob(jobId, payload) {
  if (!jobId) return;
  await supabase.from('jobs').update(payload).eq('id', jobId);
}

async function recordParseLog(quizId, payload) {
  try {
    await supabase
      .from('parse_logs')
      .insert({
        quiz_id: quizId,
        raw_text_length: payload.rawTextLength,
        question_count: payload.questionCount,
        warnings: payload.warnings || null,
        detected_format: payload.detectedFormat
      });
  } catch {
    // parse_logs is auxiliary; main parse flow should not fail if logging is unavailable.
  }
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const worker = new Worker(
  'quiz-parse-queue',
  async (job) => {
    const { quizId, filePath, rawText, jobId } = job.data;
    const warnings = [];

    await updateQuiz(quizId, {
      status: 'processing',
      parse_progress: 10,
      error_msg: null,
      updated_at: new Date().toISOString()
    });
    await updateJob(jobId, { status: 'processing', progress: 10, updated_at: new Date().toISOString() });

    const content = rawText || (filePath ? await fs.readFile(filePath, 'utf-8') : '');
    if (!content) {
      throw new Error('解析文件为空');
    }

    let questions = null;
    let parseMode = 'rule';

    await updateQuiz(quizId, { parse_progress: 30 });
    await updateJob(jobId, { progress: 30 });

    try {
      questions = await parseWithGemini(content);
      if (questions && questions.length) {
        parseMode = 'ai';
      }
    } catch (err) {
      const reason = err && err.message ? err.message : String(err || '未知错误');
      warnings.push(`AI 解析失败，已自动回退规则解析：${reason}`);
    }

    if (!questions || !questions.length) {
      await updateQuiz(quizId, { parse_progress: 60 });
      await updateJob(jobId, { progress: 60 });
      questions = parseRawToQuestions(content);
      parseMode = 'rule';
    }

    if (!questions.length) {
      throw new Error('未解析出任何题目');
    }

    const html = questionsToHtml(questions);

    await updateQuiz(quizId, {
      status: 'completed',
      parse_progress: 100,
      html,
      question_count: questions.length,
      updated_at: new Date().toISOString()
    });
    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result: {
        questionCount: questions.length,
        parseMode,
        warnings
      },
      updated_at: new Date().toISOString()
    });
    await recordParseLog(quizId, {
      rawTextLength: content.length,
      questionCount: questions.length,
      warnings: warnings.join('\n'),
      detectedFormat: parseMode
    });

    return { questionCount: questions.length, parseMode, warnings };
  },
  { connection }
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  const { quizId, jobId } = job.data;
  const message = err && err.message ? err.message : String(err || '解析失败');
  await updateQuiz(quizId, {
    status: 'failed',
    error_msg: message,
    parse_progress: 0,
    updated_at: new Date().toISOString()
  });
  await updateJob(jobId, {
    status: 'failed',
    error: message,
    updated_at: new Date().toISOString()
  });
});

worker.on('completed', () => {
  // no-op
});
