#!/bin/bash

# Meme Tracker 快速安装脚本

set -e

echo "=================================="
echo "Meme Tracker 快速安装"
echo "=================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js 20+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ 错误: Node.js 版本过低 (当前: $NODE_VERSION, 需要: 20+)"
    exit 1
fi

echo "✅ Node.js $(node -v) 已安装"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未找到 Docker"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1) 已安装"

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未找到 Docker Compose"
    echo "请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker Compose 已安装"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install

cd backend
npm install
cd ..

cd frontend
npm install
cd ..

echo "✅ 依赖安装完成"
echo ""

# 启动数据库
echo "🐳 启动数据库..."
docker-compose up -d

echo "⏳ 等待数据库启动..."
sleep 5

echo "✅ 数据库已启动"
echo ""

# 配置环境变量
echo "⚙️  配置环境变量..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.template backend/.env
    echo "📝 已创建 backend/.env 文件"
    echo ""
    echo "⚠️  重要: 请编辑 backend/.env 文件，填入你的API密钥:"
    echo "   - TWITTER_BEARER_TOKEN"
    echo "   - HELIUS_API_KEY"
    echo ""
    read -p "按回车键继续（请确保已填写API密钥）..." 
fi

# 初始化数据库
echo "🗄️  初始化数据库..."
cd backend

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed || npm run seed

cd ..

echo "✅ 数据库初始化完成"
echo ""

echo "=================================="
echo "✅ 安装完成!"
echo "=================================="
echo ""
echo "启动应用:"
echo "  npm run dev"
echo ""
echo "或者分别启动:"
echo "  后端: cd backend && npm run dev"
echo "  前端: cd frontend && npm run dev"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo ""
echo "详细文档: README.md"
echo "快速指南: QUICKSTART.md"
echo ""

