文档一：前端架构与重构指南 (Frontend Architecture & Refactoring Guide)
1. 技术栈核心规范
框架: Next.js 14/15 (App Router)

样式: Tailwind CSS (建议配置 globals.css 定义 Design Tokens)

动画: Framer Motion (用于页面转场和微交互)

数据/认证: Supabase SSR (服务端组件获取数据，客户端组件交互)

2. 目录结构重构 (解决“布局混乱”与“业务断裂”)
目前你的结构比较扁平，建议利用 Route Groups (folder) 来隔离不同的布局逻辑：

Bash
app/
├── (marketing)      # 营销/落地页布局 (无 Sidebar，宽屏展示)
│   ├── page.tsx     # 首页 (Landing Page)
│   └── layout.tsx   # 包含 Marketing Header/Footer
├── (auth)           # 认证页布局 (居中/简洁，无干扰)
│   ├── layout.tsx   # 定义全屏居中容器 + 动态背景
│   ├── login/       # 登录
│   └── register/    # 注册
├── (app)            # 核心业务布局 (有 Sidebar, Protected Routes)
│   ├── layout.tsx   # 关键: 包含 Sidebar + Header + AuthGuard
│   ├── dashboard/   # 仪表盘
│   ├── quiz/        # 题库列表
│   ├── quiz/[id]/   # 做题界面 (可考虑再次隔离以隐藏 Sidebar 沉浸式做题)
│   └── error-book/  # 错题本 (原 wrong-questions)
├── api/             # Route Handlers
└── template.tsx     # 关键: 用于 Framer Motion 页面切换动画
3. 核心功能修复方案
A. 认证流程修复 (Auth Flow)
你提到的“登录无法实现”通常是因为中间件缺失或状态同步失败。

Middleware (中间件): 必须在 middleware.ts 中使用 createServerClient 拦截请求。未登录用户访问 (app) 路由时强制重定向到 /login。

Server Actions: 登录/注册表单必须使用 Server Actions 提交，直接在服务端处理 Supabase 逻辑，减少客户端水合错误。

B. 页面转场 (Framer Motion)
解决“仓促感”的核心。在 app/template.tsx 中添加：

TypeScript
// app/template.tsx
'use client'
import { motion } from 'framer-motion'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}
文档二：界面与交互优化文档 (UI/UX Design & Interaction Spec)
1. 设计语言体系 (Design System)
风格关键词: Vercel-style, Clean, Academic.

排版 (Typography): 使用 Inter 或系统默认 sans-serif。正文 text-slate-600，标题 text-slate-900。

色彩 (Colors):

主色: Indigo-600 (用于主按钮、激活状态)

背景: Slate-50 (App背景), White (卡片背景)

边框: Slate-200 (极细边框，配合阴影)

圆角: 统一 rounded-xl (12px) 或 rounded-2xl (16px)，拒绝直角。

2. 关键页面重设计方案
A. 登录/注册页 (Auth)
当前问题: “丑”、“无逻辑”。

优化方案:

布局: 双栏布局。左侧放一张高质量的抽象 3D 插图或标语（"Master Your Knowledge"），右侧放简洁的表单。

表单: 输入框移除默认丑陋边框，使用 ring-1 ring-slate-200 focus:ring-indigo-500。

反馈: 点击登录按钮时，按钮变 Loading 状态（转圈），防止重复提交。

B. 仪表盘与题库 (Dashboard)
布局: 左侧固定宽度的 Sidebar（包含：概览、题库、错题本、AI解析、设置）。

内容区:

欢迎卡片: "早安，[用户]。你昨天完成了 X 道题。"

Grid 布局: 题库列表使用 grid-cols-3，每个卡片包含：题目分类 Tag、难度颜色点、进度条。

交互: 鼠标悬停卡片时，卡片轻微上浮 (scale-105) 并加深阴影。

C. 做题与解析界面 (Quiz & AI)
沉浸式模式: 隐藏 Sidebar，顶部仅留进度条和倒计时。

题目区域: 居中，最大宽度 max-w-3xl。字体放大 (text-lg)，行高宽松。

AI 解析区:

不要直接把一坨文字甩出来。

使用 "Streaming UI" 效果（打字机效果）逐步显示 AI 的思路。

布局: 左侧题目，右侧 AI 解析（桌面端）；或 底部抽屉弹出解析（移动端）。

3. 推荐组件库 (快速实现)
鉴于你需要“不丑”且“Next.js + Tailwind”，强烈建议直接引入 shadcn/ui。

它不是组件库，是复制代码。

复制 Card, Button, Input, Form, Sheet (侧边栏用) 即可搭建出专业级 UI。