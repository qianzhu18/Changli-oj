import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { callGemini } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const questionText = String(body.questionText || '');
    const explanation = String(body.explanation || '');
    const prompt = `请补全以下题目的解析，确保逻辑清晰、步骤完整。\n题目：${questionText}\n已有解析：${explanation}`;
    const result = await callGemini([{ role: 'user', content: prompt }]);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
}
