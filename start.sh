#!/bin/sh

# 设置错误处理
set -e

# 输出启动日志
echo "🚀 Starting Lexicon Web Application..."
echo "📁 Checking dist directory..."

# 检查 dist 目录是否存在
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found"
    exit 1
fi

# 检查 dist 目录是否为空
if [ ! "$(ls -A dist)" ]; then
    echo "❌ Error: dist directory is empty"
    exit 1
fi

echo "✅ dist directory found and contains files"

# 等待几秒确保服务完全启动
echo "⏳ Waiting for system to initialize..."
sleep 3

# 启动静态文件服务
echo "🌐 Starting static file server on port 3000..."
echo "📍 Serving files from: $(pwd)/dist"

# 启动服务，添加详细日志
exec serve -s dist -l 3000 --no-clipboard -v