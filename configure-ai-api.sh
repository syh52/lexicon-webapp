#!/bin/bash

# AI API配置脚本
# 用于配置CloudBase环境变量

echo "🤖 AI API配置助手"
echo "=================="

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}正在配置AI API环境变量...${NC}"

# 用户提供的配置
API_KEY="sk-MVwM0Y77CDZbTMT0cFoDe5WSZuYZk1G64dMWE6hpBitqgkgT"
API_BASE="https://www.chataiapi.com/v1"
DEFAULT_MODEL="gpt-4o-mini"
TEMPERATURE="0.7"
MAX_TOKENS="200"

echo -e "${GREEN}将配置以下环境变量：${NC}"
echo "API_KEY: ${API_KEY:0:20}..."
echo "API_BASE: $API_BASE"
echo "DEFAULT_MODEL: $DEFAULT_MODEL"
echo "TEMPERATURE: $TEMPERATURE"
echo "MAX_TOKENS: $MAX_TOKENS"

# 配置环境变量的说明
echo ""
echo -e "${YELLOW}请手动在CloudBase控制台配置以下环境变量：${NC}"
echo ""
echo "1. 登录腾讯云CloudBase控制台"
echo "2. 进入您的环境 -> 云函数 -> ai-chat -> 配置 -> 环境变量"
echo "3. 添加以下环境变量："
echo ""
echo -e "${GREEN}变量名: API_KEY${NC}"
echo "变量值: $API_KEY"
echo ""
echo -e "${GREEN}变量名: API_BASE${NC}" 
echo "变量值: $API_BASE"
echo ""
echo -e "${GREEN}变量名: DEFAULT_MODEL${NC}"
echo "变量值: $DEFAULT_MODEL"
echo ""
echo -e "${GREEN}变量名: TEMPERATURE${NC}"
echo "变量值: $TEMPERATURE"
echo ""
echo -e "${GREEN}变量名: MAX_TOKENS${NC}"
echo "变量值: $MAX_TOKENS"
echo ""
echo -e "${GREEN}变量名: USE_NEW_API_FORMAT${NC}"
echo "变量值: true"
echo ""

# 生成环境变量配置文件
cat > .env.cloudbase << EOF
# CloudBase环境变量配置
# 请将这些变量添加到CloudBase控制台中

API_KEY=$API_KEY
API_BASE=$API_BASE
DEFAULT_MODEL=$DEFAULT_MODEL
TEMPERATURE=$TEMPERATURE
MAX_TOKENS=$MAX_TOKENS
USE_NEW_API_FORMAT=true
EOF

echo -e "${GREEN}✅ 已生成 .env.cloudbase 配置文件${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "- 配置完成后，需要重新部署ai-chat云函数"
echo "- 可以通过 npm run deploy-functions 来部署所有云函数"
echo "- 也可以单独部署 ai-chat 函数"
echo ""
echo -e "${GREEN}🎉 配置完成！${NC}"