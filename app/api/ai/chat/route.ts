import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { callGemini } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const conversationId = String(body.conversationId || '');
    const message = String(body.message || '').trim();
    if (!conversationId || !message) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const dailyLimit = Number(process.env.AI_DAILY_LIMIT || 20);
    if (usage?.count >= dailyLimit) {
      return NextResponse.json({ error: '今日追问次数已用完' }, { status: 429 });
    }

    const { data: convo, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error || !convo) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const contextText = `题目：${convo.context?.questionText || ''}\n解析：${convo.context?.explanation || ''}`;
    const history = Array.isArray(convo.messages) ? convo.messages : [];
    const promptMessages = [
      { role: 'user' as const, content: contextText },
      ...history,
      { role: 'user' as const, content: message }
    ];

    const responseText = await callGemini(promptMessages);
    const updatedMessages = [...history, { role: 'user', content: message }, { role: 'model', content: responseText }];

    await supabase
      .from('ai_conversations')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (usage) {
      await supabase
        .from('ai_usage')
        .update({ count: usage.count + 1 })
        .eq('id', usage.id);
    } else {
      await supabase.from('ai_usage').insert({ user_id: user.id, date: today, count: 1 });
    }

    return NextResponse.json({ messages: updatedMessages });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'AI 调用失败' }, { status: 500 });
  }
}
