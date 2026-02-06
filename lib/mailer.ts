interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(input: SendMailInput) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = process.env.EMAIL_FROM || '';
  const isProd = process.env.NODE_ENV === 'production';

  if (!apiKey || !from) {
    if (isProd) {
      throw new Error('未配置邮件服务（RESEND_API_KEY / EMAIL_FROM）');
    }
    return { mode: 'dev' as const };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || '邮件发送失败');
  }

  return { mode: 'resend' as const };
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  const subject = '畅理题库验证码';
  const text = `你的验证码是 ${code}，10 分钟内有效。`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 8px 0">畅理题库登录验证码</h2>
      <p style="margin:0 0 12px 0">你的验证码如下，10 分钟内有效：</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:8px 0 14px 0">${code}</div>
      <p style="margin:0;color:#475569">如果不是你本人操作，请忽略此邮件。</p>
    </div>
  `;
  return sendMail({ to: email, subject, html, text });
}
