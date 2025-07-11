# Lexicon 项目部署指南

## 🛠️ 环境要求

### 1. Node.js 安装
- **版本要求**: >= 18.0.0
- **当前版本**: v22.17.0 ✅
- **安装方式**: 
  - [Node.js 官网](https://nodejs.org/) 下载 LTS 版本
  - 或使用版本管理工具: `fnm` / `nvm` / `volta`

### 2. CloudBase CLI 安装
```bash
# 使用 npm 安装
npm i -g @cloudbase/cli

# 如果访问速度慢，使用腾讯云镜像
npm i -g @cloudbase/cli --registry=http://mirrors.cloud.tencent.com/npm/

# 验证安装
tcb -v
```

**当前版本**: CloudBase CLI 2.7.7 ✅

### 3. 网络配置
如果网络访问受限，请设置代理：

```bash
# Linux/macOS
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
```

## 🚀 部署方式

### 方式一：静态托管部署（推荐）

**特点**:
- ✅ 部署速度快
- ✅ 免费使用
- ✅ 支持CDN加速
- ✅ 适合前端应用

**部署命令**:
```bash
# 手动部署
npm run build
cloudbase hosting deploy dist -e cloud1-7g7oatv381500c81

# 或使用快速脚本
./deploy.sh          # Linux/macOS
deploy.bat           # Windows
```

### 方式二：云托管部署

**特点**:
- ✅ 容器化部署
- ✅ 自动扩缩容
- ✅ 支持自定义域名
- ⚠️ 需要按量付费环境

**部署命令**:
```bash
# 确保环境为按量付费模式
cloudbase framework deploy

# 或使用混合脚本
./deploy-hybrid.sh   # Linux/macOS
deploy-hybrid.bat    # Windows
```

## 🔧 配置文件说明

### cloudbaserc.json
```json
{
  "envId": "cloud1-7g7oatv381500c81",
  "version": "2.0",
  "functionRoot": "./cloudfunctions",
  "framework": {
    "name": "lexicon-vocabulary-app",
    "plugins": {
      "client": {
        "use": "@cloudbase/framework-plugin-container",
        "inputs": {
          "serviceName": "lexicon-app",
          "servicePath": "/lexicon",
          "containerPort": 3000
        }
      }
    }
  }
}
```

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

## 📱 部署结果

### 静态托管
- **访问地址**: [https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com](https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com)
- **状态**: ✅ 已成功部署
- **更新**: 运行 `./deploy.sh` 或 `deploy.bat`

### 云托管
- **状态**: ⏳ 等待计费模式切换生效
- **预计**: 2-6小时后可用
- **访问地址**: 待部署成功后自动生成

## 🔍 故障排除

### 1. 网络连接问题
**症状**: `socket hang up` 或 `ECONNRESET`
**解决**:
```bash
# 设置代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 或者使用腾讯云镜像
npm config set registry http://mirrors.cloud.tencent.com/npm/
```

### 2. 计费模式问题
**症状**: `云托管当前只能部署到按量付费的环境下`
**解决**:
1. 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境 `cloud1-7g7oatv381500c81`
3. 切换计费模式为"按量付费"
4. 等待2-6小时后重试

### 3. 构建失败
**症状**: `npm run build` 失败
**解决**:
```bash
# 清理依赖
rm -rf node_modules package-lock.json
npm install

# 或使用 yarn
yarn install
```

### 4. 权限问题
**症状**: `Permission denied` 或 `EACCES`
**解决**:
```bash
# 给脚本执行权限
chmod +x deploy.sh
chmod +x deploy-hybrid.sh

# 或使用 sudo 安装 CLI
sudo npm i -g @cloudbase/cli
```

## 📋 部署检查清单

### 部署前检查
- [ ] Node.js 版本 >= 18
- [ ] CloudBase CLI 已安装并登录
- [ ] 网络连接正常（设置代理如需要）
- [ ] 项目构建成功 (`npm run build`)

### 静态托管检查
- [ ] 环境ID正确: `cloud1-7g7oatv381500c81`
- [ ] 静态托管已开启
- [ ] 文件上传成功
- [ ] 访问地址正常

### 云托管检查
- [ ] 环境为按量付费模式
- [ ] Docker 配置正确
- [ ] 端口配置正确 (3000)
- [ ] 服务启动成功

## 🎯 快速部署

**最简单的部署方式**:
```bash
# 1. 克隆项目
git clone <repository>
cd lexicon-webapp

# 2. 安装依赖
npm install

# 3. 快速部署
./deploy.sh
```

**访问地址**: [https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com](https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com)

## 📞 技术支持

如果遇到问题，请：
1. 检查网络连接和代理设置
2. 确认环境ID和计费模式
3. 查看部署日志: `~/.tcb/logs/`
4. 联系技术支持或提交 Issue 