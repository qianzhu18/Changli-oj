import * as cheerio from 'cheerio';

export type QuestionType = 'choice' | 'fill' | 'essay';

export interface ParsedQuestion {
  index: number;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectBlocks(raw: string) {
  const cleaned = normalize(raw);
  if (!cleaned) return [] as string[];
  const parts = cleaned
    .split(/\n(?=(?:\d{1,3}[\.、]|Q\d+|题\d+)[\s\S]*)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [cleaned];
}

function parseBlock(block: string, index: number): ParsedQuestion {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  let questionText = '';
  const options: string[] = [];
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
    } else {
      if (!explanation) {
        explanation = explanation ? `${explanation}\n${line}` : line;
      }
    }
  }

  const type: QuestionType = options.length
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

export function parseRawToQuestions(raw: string) {
  const blocks = detectBlocks(raw);
  return blocks.map((block, idx) => parseBlock(block, idx + 1));
}

export function questionsToHtml(questions: ParsedQuestion[]) {
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

export function parseHtmlToQuestions(html: string): ParsedQuestion[] {
  const $ = cheerio.load(html);
  const result: ParsedQuestion[] = [];
  $('.question').each((_, el) => {
    const index = Number($(el).attr('data-index') || result.length + 1);
    const type = ($(el).attr('data-type') as QuestionType) || 'choice';
    const questionText = $(el).find('.question-text').text().trim();
    const options: string[] = [];
    $(el)
      .find('.options li')
      .each((__, li) => {
        options.push($(li).text().trim());
      });
    const correctAnswer = $(el).find('.answer').text().trim();
    const explanation = $(el).find('.explanation').text().trim();
    result.push({
      index,
      type,
      questionText,
      options: options.length ? options : undefined,
      correctAnswer,
      explanation
    });
  });
  return result;
}
