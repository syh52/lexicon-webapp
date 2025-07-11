#!/bin/bash

# Lexicon 项目配置检查脚本
echo "🔍 检查 Lexicon 项目部署配置..."
echo ""

# 检查 Node.js 版本
echo "1. 检查 Node.js 版本..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js 版本: $NODE_VERSION"
    
    # 检查是否 >= 18
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo "   ✅ 版本符合要求 (>= 18)"
    else
        echo "   ❌ 版本过低，需要 >= 18"
    fi
else
    echo "   ❌ Node.js 未安装"
fi

echo ""

# 检查 CloudBase CLI
echo "2. 检查 CloudBase CLI..."
if command -v tcb &> /dev/null; then
    TCB_VERSION=$(tcb -v | head -1 | cut -d' ' -f3)
    echo "   ✅ CloudBase CLI 版本: $TCB_VERSION"
else
    echo "   ❌ CloudBase CLI 未安装"
    echo "   💡 安装命令: npm i -g @cloudbase/cli"
fi

echo ""

# 检查登录状态
echo "3. 检查登录状态..."
if tcb env list &> /dev/null; then
    echo "   ✅ 已登录 CloudBase"
else
    echo "   ❌ 未登录 CloudBase"
    echo "   💡 登录命令: tcb login"
fi

echo ""

# 检查网络代理
echo "4. 检查网络代理..."
if [ -n "$HTTP_PROXY" ]; then
    echo "   ✅ HTTP_PROXY: $HTTP_PROXY"
else
    echo "   ⚠️ HTTP_PROXY 未设置"
fi

if [ -n "$HTTPS_PROXY" ]; then
    echo "   ✅ HTTPS_PROXY: $HTTPS_PROXY"
else
    echo "   ⚠️ HTTPS_PROXY 未设置"
fi

echo ""

# 检查项目文件
echo "5. 检查项目文件..."
if [ -f "package.json" ]; then
    echo "   ✅ package.json 存在"
else
    echo "   ❌ package.json 不存在"
fi

if [ -f "cloudbaserc.json" ]; then
    echo "   ✅ cloudbaserc.json 存在"
else
    echo "   ❌ cloudbaserc.json 不存在"
fi

if [ -f "Dockerfile" ]; then
    echo "   ✅ Dockerfile 存在"
else
    echo "   ❌ Dockerfile 不存在"
fi

echo ""

# 检查构建目录
echo "6. 检查构建状态..."
if [ -d "dist" ]; then
    FILE_COUNT=$(ls -1 dist/ | wc -l)
    echo "   ✅ dist 目录存在，包含 $FILE_COUNT 个文件"
else
    echo "   ⚠️ dist 目录不存在，需要运行: npm run build"
fi

if [ -d "node_modules" ]; then
    echo "   ✅ node_modules 存在"
else
    echo "   ⚠️ node_modules 不存在，需要运行: npm install"
fi

echo ""

# 检查部署脚本
echo "7. 检查部署脚本..."
SCRIPTS=("deploy.sh" "deploy.bat" "deploy-hybrid.sh" "deploy-hybrid.bat")
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "   ✅ $script 存在且可执行"
        else
            echo "   ⚠️ $script 存在但不可执行，运行: chmod +x $script"
        fi
    else
        echo "   ❌ $script 不存在"
    fi
done

echo ""

# 网络连接测试
echo "8. 网络连接测试..."
if curl -s --connect-timeout 5 https://tcb.cloud.tencent.com > /dev/null; then
    echo "   ✅ 网络连接正常"
else
    echo "   ❌ 网络连接失败"
    echo "   💡 检查网络或代理设置"
fi

echo ""

# 总结
echo "🎯 配置检查完成！"
echo ""
echo "📋 下一步操作建议:"
echo "   1. 如果所有检查都通过，运行: ./deploy.sh"
echo "   2. 如果有问题，请根据上述提示进行修复"
echo "   3. 查看详细部署指南: cat DEPLOYMENT_GUIDE.md"
echo ""
echo "🌐 当前访问地址: https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com" 