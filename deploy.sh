#!/bin/bash

# Lexicon 项目快速部署脚本
echo "🚀 开始部署 Lexicon 项目..."

# 第一步：构建项目
echo "📦 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

# 第二步：部署到静态网站托管
echo "🌐 部署到静态网站托管..."
npx tcb hosting deploy dist -e cloud1-7g7oatv381500c81

# 检查部署是否成功
if [ $? -eq 0 ]; then
    echo "🎉 部署成功！"
    echo "📱 访问地址: https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com"
    echo "⏰ 由于 CDN 缓存，新内容可能需要几分钟才能生效"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi 