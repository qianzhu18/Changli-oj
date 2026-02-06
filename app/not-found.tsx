import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="card" style={{ maxWidth: 680, margin: '60px auto', textAlign: 'center' }}>
      <h2 className="section-title">页面不存在</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        你访问的地址无效，可能是旧链接或端口错误。请从下面入口进入。
      </p>
      <div className="flex" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="button" href="/">
          回到题库广场
        </Link>
        <Link className="button secondary" href="/login">
          去登录
        </Link>
        <Link className="button secondary" href="/register">
          去注册
        </Link>
      </div>
    </div>
  );
}
