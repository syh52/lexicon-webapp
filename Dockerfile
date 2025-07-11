# 使用Node.js 18官方镜像作为构建环境
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM node:18-alpine

# 安装必要的工具和依赖
RUN apk add --no-cache curl && \
    npm install -g serve@14.2.3

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

# 创建健康检查脚本
RUN echo '#!/bin/sh\ncurl -f -s http://localhost:3000/ > /dev/null || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/healthcheck.sh"]

# 启动应用
CMD ["/start.sh"]