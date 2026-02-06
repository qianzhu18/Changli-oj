export type AiMessage = { role: 'user' | 'model' | 'system'; content: string };

export async function callGemini(messages: AiMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return '（Mock）暂时未配置 Gemini API Key，建议补充解析思路：回顾题干关键词，列出关键公式与推导步骤。';
  }

  const payload = {
    contents: messages.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
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
    const text = await res.text();
    throw new Error(text || 'Gemini 调用失败');
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || 'AI 暂时没有给出回答';
}
