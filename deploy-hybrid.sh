#!/bin/bash

# Lexicon 项目混合部署脚本
echo "🚀 开始混合部署 Lexicon 项目..."

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

# 第二步：尝试云托管部署
echo "🔄 尝试云托管部署..."
cloudbase framework deploy

# 检查云托管部署是否成功
if [ $? -eq 0 ]; then
    echo "🎉 云托管部署成功！"
    echo "📱 云托管访问地址: https://lexicon-app-服务域名/lexicon"
else
    echo "⚠️ 云托管部署失败，切换到静态托管..."
    
    # 第三步：静态托管部署
    echo "🌐 部署到静态网站托管..."
    cloudbase hosting deploy dist -e cloud1-7g7oatv381500c81
    
    # 检查静态托管部署是否成功
    if [ $? -eq 0 ]; then
        echo "🎉 静态托管部署成功！"
        echo "📱 静态托管访问地址: https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com"
        echo "⏰ 由于 CDN 缓存，新内容可能需要几分钟才能生效"
    else
        echo "❌ 静态托管部署也失败，请检查错误信息"
        exit 1
    fi
fi

echo "✅ 部署完成！" 