# 畅理题库（Next.js 一体化）

这是基于 Supabase 的题库刷题与管理平台，包含：
- 客户端：题库广场、刷题、错题本、AI 追问
- 管理端：上传解析、题库编辑、AI 辅助、报错处理、统计

## 🚀 快速开始

### 方式一：使用配置脚本（推荐）

```bash
# 1. 检查环境配置
./check-env.sh

# 2. 启动开发服务器
npm run dev
# 如果端口被占用或出现旧缓存，使用清理启动
npm run dev:clean

# 3. 新开终端，启动 Worker
npm run worker
```

### 方式二：手动配置

详细配置步骤请查看：
- 📖 [快速配置卡片](./快速配置卡片.md) - 3分钟快速启动
- 📚 [环境变量配置指南](./环境变量配置指南.md) - 完整配置说明

## 📋 环境要求

- Node.js 18+（本项目使用 Node 22）
- Redis（BullMQ 队列）
- Supabase 项目（PostgreSQL）

## ⚙️ 环境变量配置

### 必需配置（4项）

```bash
# 1. 复制配置文件
cp .env.local.example .env.local

# 2. 编辑 .env.local，填写以下内容：
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的service_role密钥
JWT_SECRET=你的随机字符串
REDIS_URL=redis://localhost:6379
```

### 可选配置

```bash
# Gemini API（AI 功能）
GEMINI_API_KEY=你的API_Key

# 管理员邮箱
ADMIN_EMAILS=admin@example.com
```

**获取外部服务：**
- 🌐 [Supabase](https://supabase.com) - 免费数据库
- 🌐 [Gemini API](https://aistudio.google.com/app/apikey) - 免费AI服务
- 🌐 [Upstash](https://upstash.com) - 免费 Redis（推荐）

## 🗄️ 数据库初始化

1. 登录 Supabase 控制台
2. 点击 **SQL Editor**
3. 运行 [`database/schema.sql`](./database/schema.sql)

## 🏃 运行项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 或清理后启动（推荐）
npm run dev:clean

# 启动解析 Worker（新终端）
npm run worker
```

访问：
- 客户端首页：http://localhost:3003
- 管理面板：http://localhost:3003/admin
- 注册页面：http://localhost:3003/register

## 🔐 登录注册（邮箱验证码）

- 注册与登录都需要：`邮箱 + 密码 + 6位邮箱验证码`
- 前端页面已内置“发送验证码”按钮与 60 秒冷却
- 开发环境未配置邮件服务时，接口会返回 `devCode` 便于本地调试

邮件配置（生产建议）：
```bash
RESEND_API_KEY=你的Resend密钥
EMAIL_FROM=Changli OJ <noreply@你的域名>
```

## 📚 文档导航

### 配置文档
- 📖 [快速配置卡片](./快速配置卡片.md) - 快速启动指南
- 📚 [环境变量配置指南](./环境变量配置指南.md) - 详细配置说明

### 产品文档
- 📋 [产品需求文档](./docs/)
  - [客户端 PRD](./docs/Prd-客户端.md)
  - [客户端 DevSpec](./docs/DevSpec-客户端.md)
  - [管理面板 PRD](./docs/Prd-管理面板.md)
  - [管理面板 DevSpec](./docs/DevSpec-管理面板.md)

### 前端开发
- 🎨 [前端爆改开发文档](./docs/前端爆改开发文档.md) - 完整的 UI/UX 升级指南
- ⚡ [前端爆改快速开始](./docs/前端爆改快速开始.md) - 5分钟快速上手
- 🔄 [组件改造对照表](./docs/组件改造对照表.md) - 旧代码 vs 新代码对照

## 🎯 核心功能

### 客户端
- 题库广场：浏览所有已发布的题库
- 一屏一题刷题：左右分栏布局（左题目、右答案+解析）
- 错题本：自动记录错题，支持复习
- AI 追问：对解析不满意时可追问 AI

### 管理面板
- 文件上传：支持 .txt、.md 格式
- AI 自动解析：自动识别题目、答案、解析
- 题库编辑：Monaco 编辑器 + 实时预览
- AI 辅助：核实答案、补全解析
- 发布管理：一键发布到客户端
- 报错处理：查看和处理用户报错

## ⚠️ 常见问题

### 1. Redis 连接失败
```bash
# 启动 Redis
brew services start redis
# 或
redis-server
```

### 2. 数据库表不存在
在 Supabase 控制台运行 `database/schema.sql`

如果你是旧库升级，请确认已新增：
- `email_verification_codes`（邮箱验证码）

### 3. Worker 无法启动
```bash
npm install --save-dev ts-node
```

### 4. 环境变量未生效
- 确保文件名是 `.env.local`（不是 `.env`）
- 重启开发服务器

## 📝 说明

- 上传题库仅支持 `.txt/.md`，最大 10MB
- 解析逻辑为规则化解析（可根据题库格式迭代）
- AI 追问与 AI 辅助默认调用 Gemini API
- 未配置 API Key 时进入 Mock 模式

## 📄 许可证

MIT
