#!/bin/bash

# 畅理题库 - 前端爆改自动化脚本

echo "🎨 畅理题库 - 前端爆改安装脚本"
echo "================================"
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在项目根目录运行此脚本"
  exit 1
fi

# Step 1: 安装依赖
echo "📦 Step 1/5: 安装依赖..."
npm install framer-motion lucide-react clsx tailwind-merge
if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi
echo "✅ 依赖安装完成"
echo ""

# Step 2: 安装 Tailwind CSS
echo "📦 Step 2/5: 安装 Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
if [ $? -ne 0 ]; then
  echo "❌ Tailwind 安装失败"
  exit 1
fi
echo "✅ Tailwind 安装完成"
echo ""

# Step 3: 初始化 Tailwind
echo "⚙️  Step 3/5: 初始化 Tailwind 配置..."
if [ ! -f "tailwind.config.ts" ]; then
  npx tailwindcss init -p
  echo "✅ Tailwind 配置文件已创建"
else
  echo "⚠️  tailwind.config.ts 已存在，跳过"
fi
echo ""

# Step 4: 创建必要的目录
echo "📁 Step 4/5: 创建组件目录..."
mkdir -p components/ui
mkdir -p components/animations
mkdir -p components/layout
echo "✅ 目录结构已创建"
echo ""

# Step 5: 创建工具函数
echo "📝 Step 5/5: 创建工具函数..."
if [ ! -f "lib/utils.ts" ]; then
  cat > lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
  echo "✅ lib/utils.ts 已创建"
else
  echo "⚠️  lib/utils.ts 已存在，跳过"
fi
echo ""

echo "================================"
echo "🎉 安装完成！"
echo ""
echo "📝 下一步："
echo "1. 查看配置文档: docs/前端爆改快速开始.md"
echo "2. 更新 app/globals.css（添加 @tailwind 指令）"
echo "3. 创建第一个组件: components/ui/button.tsx"
echo ""
echo "🚀 开始改造你的应用吧！"
