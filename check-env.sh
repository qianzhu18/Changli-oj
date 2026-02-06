#!/bin/bash

# 畅理题库 - 环境检查脚本

echo "🔍 正在检查畅理题库的环境配置..."
echo ""

# 检查 .env.local 文件
if [ ! -f .env.local ]; then
    echo "❌ 未找到 .env.local 文件"
    echo "   请执行: cp .env.local.example .env.local"
    echo "   然后编辑 .env.local 填写配置"
    exit 1
fi

echo "✅ .env.local 文件存在"

# 加载环境变量
export $(grep -v '^#' .env.local | xargs)

# 检查必需的环境变量
check_var() {
    if [ -z "${!1}" ]; then
        echo "❌ $1 未配置"
        return 1
    else
        echo "✅ $1 已配置"
        return 0
    fi
}

echo ""
echo "检查环境变量："
check_var "SUPABASE_URL"
check_var "SUPABASE_SERVICE_ROLE_KEY"
check_var "JWT_SECRET"
check_var "REDIS_URL"

echo ""

# 邮件配置检查（登录/注册验证码）
if [ -z "${RESEND_API_KEY:-}" ] || [ -z "${EMAIL_FROM:-}" ]; then
    echo "⚠️  邮件服务未完整配置（RESEND_API_KEY / EMAIL_FROM）"
    echo "   登录/注册发送验证码将失败"
else
    echo "✅ 邮件服务配置已检测到"
fi

echo ""

# 检查 Redis 连接
if command -v redis-cli &> /dev/null; then
    echo "🔍 检查 Redis 连接..."
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis 正在运行"
    else
        echo "⚠️  Redis 未运行"
        echo "   请执行: brew services start redis"
        echo "   或: redis-server"
    fi
else
    echo "⚠️  未安装 redis-cli"
    echo "   请执行: brew install redis"
fi

echo ""

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js 已安装: $NODE_VERSION"
else
    echo "❌ 未安装 Node.js"
    echo "   请访问 https://nodejs.org 下载安装"
fi

# 检查依赖
if [ -d node_modules ]; then
    echo "✅ 依赖已安装"
else
    echo "⚠️  依赖未安装"
    echo "   请执行: npm install"
fi

echo ""
echo "================================"
echo "📝 启动命令："
echo ""
echo "1. 启动开发服务器："
echo "   npm run dev"
echo ""
echo "2. 启动 Worker（新终端）："
echo "   npm run worker"
echo ""
echo "================================"
echo ""
echo "📚 详细配置指南："
echo "   查看《环境变量配置指南.md》"
echo ""
