import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { callGemini } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const questionText = String(body.questionText || '');
    const answer = String(body.answer || '');
    const prompt = `请核实以下题目的答案是否正确，返回"正确/可能有误/错误"并给出简短理由和建议答案。\n题目：${questionText}\n答案：${answer}`;
    const result = await callGemini([{ role: 'user', content: prompt }]);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
