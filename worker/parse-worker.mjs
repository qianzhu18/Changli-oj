import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { promises as fs } from 'fs';
import { getRedisConnection } from '../lib/queue.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { parseRawToQuestions, questionsToHtml } from '../lib/quiz-parser.js';

dotenv.config({ path: '.env.local' });

typeof process.env.SUPABASE_URL === 'string';

const connection = getRedisConnection();
const supabase = getSupabaseAdmin();

const worker = new Worker(
  'quiz-parse-queue',
  async (job) => {
    const { quizId, filePath, rawText, jobId } = job.data;

    await supabase
      .from('quizzes')
      .update({ status: 'processing', parse_progress: 10, error_msg: null })
      .eq('id', quizId);

    if (jobId) {
      await supabase
        .from('jobs')
        .update({ status: 'processing', progress: 10 })
        .eq('id', jobId);
    }

    const content = rawText || (filePath ? await fs.readFile(filePath, 'utf-8') : '');
    if (!content) {
      throw new Error('解析文件为空');
    }

    const questions = parseRawToQuestions(content);
    const html = questionsToHtml(questions);

    await supabase
      .from('quizzes')
      .update({
        status: 'completed',
        parse_progress: 100,
        html,
        question_count: questions.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId);

    if (jobId) {
      await supabase
        .from('jobs')
        .update({ status: 'completed', progress: 100, result: { questionCount: questions.length } })
        .eq('id', jobId);
    }

    return { questionCount: questions.length };
  },
  { connection }
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  const { quizId, jobId } = job.data;
  await supabase
    .from('quizzes')
    .update({ status: 'failed', error_msg: err.message, parse_progress: 0 })
    .eq('id', quizId);
  if (jobId) {
    await supabase.from('jobs').update({ status: 'failed', error: err.message }).eq('id', jobId);
  }
});

worker.on('completed', () => {
  // no-op
});
