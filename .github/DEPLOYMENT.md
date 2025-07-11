# 🚀 GitHub Actions 自动部署配置指南

## 📋 必需的 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets：

### 步骤 1：获取腾讯云 API 密钥
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 访问 [API密钥管理](https://console.cloud.tencent.com/cam/capi)
3. 创建新的 API 密钥或使用现有密钥

### 步骤 2：获取 CloudBase 环境 ID
1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择您的环境，环境 ID 在概览页面可以找到

### 步骤 3：在 GitHub 中配置 Secrets
进入您的 GitHub 仓库 → Settings → Secrets and variables → Actions

添加以下 Repository secrets：

```
TENCENT_SECRET_ID     = 您的腾讯云 SecretId
TENCENT_SECRET_KEY    = 您的腾讯云 SecretKey  
CLOUDBASE_ENV_ID      = 您的 CloudBase 环境 ID
```

## 🔄 触发方式

### 自动触发
- 推送代码到 `main` 分支时自动部署
- 合并 Pull Request 到 `main` 分支时自动部署

### 手动触发
1. 进入 GitHub 仓库
2. 点击 Actions 标签
3. 选择 "Deploy to CloudBase" 工作流
4. 点击 "Run workflow" 按钮

## 📊 部署流程

1. **代码检出**: 拉取最新代码
2. **环境设置**: 安装 Node.js 18
3. **依赖安装**: 运行 `npm ci`
4. **项目构建**: 运行 `npm run build`
5. **CloudBase 部署**: 部署 `dist` 目录到静态托管

## 🛠 故障排除

### 常见问题

1. **密钥错误**
   - 检查 Secrets 配置是否正确
   - 确认 API 密钥权限包含 CloudBase

2. **环境 ID 错误**
   - 确认环境 ID 格式正确（如：`your-env-id`）

3. **构建失败**
   - 检查 `package.json` 中的构建脚本
   - 确认所有依赖都已正确安装

## 📝 工作流文件位置
`.github/workflows/deploy.yml`

## 🔐 安全说明
- 所有敏感信息都通过 GitHub Secrets 加密存储
- 工作流只有推送到 main 分支或手动触发时才会运行
- 部署过程完全在 GitHub Actions 的安全环境中进行