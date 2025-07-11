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

# 安装serve用于静态文件服务
RUN npm install -g serve

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["serve", "-s", "dist", "-l", "3000"]