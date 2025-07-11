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
echo "📋 Directory contents:"
ls -la dist/

# 等待几秒确保服务完全启动
echo "⏳ Waiting for system to initialize..."
sleep 2

# 启动静态文件服务
echo "🌐 Starting static file server on 0.0.0.0:3000..."
echo "📍 Serving files from: $(pwd)/dist"

# 启动服务，监听所有接口
exec serve -s dist -l 0.0.0.0:3000 --no-clipboard