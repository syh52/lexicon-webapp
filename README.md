# Lexicon 英语学习平台

一个现代化的英语学习Web应用，专为吉祥航空安全员定制，提供优质的英语学习体验。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

## 🚀 在线体验

**[https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com/](https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com/)**

## ✨ 项目特色

**Lexicon** 为吉祥航空安全员提供专业的英语学习解决方案，支持碎片化学习和个性化复习。

### 核心功能

- ✅ **完善的认证系统** - 邮箱注册/登录 + 匿名快速体验
- ✅ **FSRS背单词功能** - 基于科学间隔重复算法的真实背单词体验
- ✅ **每日学习目标** - 自定义每天背单词数量，类似扇贝单词体验
- ✅ **自动进度保存** - 学习进度实时保存，关闭页面可恢复
- ✅ **智能学习计划** - 根据用户设置生成个性化每日学习计划
- ✅ **智能卡片调度** - 4档评分系统，自适应学习间隔
- ✅ **3D翻转卡片** - 沉浸式学习界面，优秀的视觉体验
- ✅ **个性化参数优化** - 根据学习历史动态调整FSRS参数
- ✅ **学习统计分析** - 详细的进度跟踪和学习建议
- ✅ **现代UI设计** - Glass Morphism风格，流畅的交互动画

## 🛠 技术架构

### 前端技术栈
- **React 18** + **TypeScript** - 现代化前端开发
- **Vite** - 极速构建工具
- **React Router 6** - 单页应用路由管理  
- **Tailwind CSS** + **DaisyUI** - 原子化CSS框架
- **Framer Motion** - 流畅动画效果

### 云开发资源
- **CloudBase 认证** - 用户身份管理
- **云数据库** - 用户数据、学习记录和FSRS参数存储
  - `user_settings` - 用户学习偏好设置
  - `daily_study_plans` - 每日学习计划和进度
  - `study_sessions` - 学习会话详细信息
- **云函数** - FSRS算法处理和业务逻辑
  - `user-settings` - 用户设置管理
  - `daily-plan` - 每日计划管理
- **静态网站托管** - 前端应用部署

### FSRS核心技术
- **间隔重复算法** - 基于fsrs4anki项目的成熟算法
- **记忆科学** - 遗忘曲线和最优复习间隔
- **个性化学习** - 根据用户表现调整参数
- **智能调度** - 自适应卡片优先级管理

## 📚 文档中心

详细的项目文档已整理至 [`docs/`](./docs/) 目录：

- **[架构设计](./docs/architecture/)** - 数据库设计、UI设计规范
- **[开发文档](./docs/development/)** - 组件开发、调试经验
- **[分析报告](./docs/analysis/)** - 性能分析、功能分析
- **[方案规划](./docs/planning/)** - 语音对话AI集成方案
- **[组件文档](./docs/components/)** - 可复用组件使用指南

## 开始使用

### 前提条件

- 安装 Node.js (版本 14 或更高)
- 腾讯云开发账号 (可在[腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)

### 安装依赖

```bash
npm install
```

### 配置云开发环境

1. 打开 `src/utils/cloudbase.js` 文件
2. 将 `ENV_ID` 变量的值修改为您的云开发环境 ID
3. 将 `vite.config.js` 中的`https://envId-appid.tcloudbaseapp.com/` 替换为你的云开发环境静态托管默认域名，可以使用 MCP 来查询云开发环境静态托管默认域名

### 本地开发

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 初始化FSRS数据库和示例数据

```bash
# 初始化数据库结构
node scripts/init-fsrs-database.js

# 导入示例单词数据
node scripts/import-sample-words.js
```

### 部署云函数

```bash
# 部署FSRS服务云函数
tcb fn deploy fsrs-service
```

### 本地测试云托管环境

```bash
npm run start
```

## 部署指南

### 快速部署到静态网站托管

项目已成功配置静态网站托管部署，支持以下方式：

#### 方式一：使用快速部署脚本（推荐）

**Linux/macOS:**
```bash
./deploy.sh
```

**Windows:**
```batch
deploy.bat
```

#### 方式二：手动部署命令
```bash
# 1. 构建项目
npm run build

# 2. 部署到静态网站托管
cloudbase hosting deploy dist -e cloud1-7g7oatv381500c81
```

#### 方式三：部署到云托管（需要按量付费环境）
```bash
# 前提：需要在控制台切换到按量付费模式
cloudbase framework deploy
```

### 部署要求
- ✅ 已安装 Node.js 18+ (当前: v22.17.0)
- ✅ 已安装 CloudBase CLI 2.7.7+
- ✅ 已登录 CloudBase 平台
- ✅ 静态网站托管已开启（免费）
- ✅ 网络代理已配置（如需要）
- ⚠️ 云托管需要按量付费环境

### 网络配置（可选）
如果网络访问受限，请设置代理：
```bash
# Linux/macOS
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
```

### 🚀 在线体验

项目已成功部署到云开发静态网站托管，可直接访问体验：

**[在线体验地址](https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com)** 

> 注意：由于 CDN 缓存，新部署的内容可能需要几分钟才能生效。

### FSRS背单词功能

- ✅ **科学间隔重复** - 基于FSRS算法的智能复习调度
- ✅ **4档评分系统** - Again, Hard, Good, Easy 精准评估
- ✅ **3D翻转卡片** - 沉浸式学习体验，流畅动画效果
- ✅ **个性化参数** - 根据学习历史自动优化算法参数
- ✅ **学习统计** - 实时准确率、进度跟踪和学习建议
- ✅ **语音播放** - 支持单词发音，提升学习效果
- ✅ **状态管理** - 完整的卡片状态追踪(new→learning→review)
- ✅ **数据持久化** - 学习记录云端存储，支持跨设备同步

### 认证系统功能

- ✅ **邮箱注册/登录** - 支持用户邮箱账号创建和登录
- ✅ **匿名登录** - 无需注册，一键快速体验
- ✅ **安全存储** - 密码使用SHA256+盐值安全哈希
- ✅ **表单验证** - 邮箱格式和密码强度验证
- ✅ **状态管理** - 完整的用户认证状态管理
- ✅ **响应式设计** - 适配桌面和移动设备

## 目录结构

```
├── public/               # 静态资源
├── src/
│   ├── components/       # 可复用组件
│   │   ├── study/        # 学习相关组件
│   │   │   ├── StudyCard.tsx      # 3D翻转学习卡片
│   │   │   ├── StudyProgress.tsx  # 学习进度显示
│   │   │   └── StudyStats.tsx     # 学习统计分析
│   │   ├── ui/           # 基础UI组件
│   │   └── layout/       # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── StudyPage.tsx # 学习页面（支持进度恢复）
│   │   ├── SettingsPage.tsx # 用户设置页面
│   │   ├── WordbooksPage.tsx # 词书页面
│   │   └── ...
│   ├── services/         # 业务服务
│   │   ├── userSettingsService.ts    # 用户设置管理
│   │   ├── dailyPlanService.ts       # 每日计划管理
│   │   ├── DailyPlanGenerator.ts     # 学习计划生成器
│   │   └── wordbookService.ts        # 词书服务
│   ├── utils/            # 工具函数
│   │   ├── fsrs.js       # FSRS算法实现
│   │   ├── simpleReviewAlgorithm.js  # 简化复习算法
│   │   └── cloudbase.js  # 云开发初始化
│   ├── contexts/         # React上下文
│   ├── App.tsx           # 应用入口
│   ├── main.tsx          # 渲染入口
│   └── index.css         # 全局样式
├── cloudfunctions/       # 云函数
│   ├── fsrs-service/     # FSRS服务云函数
│   ├── user-settings/    # 用户设置管理云函数
│   └── daily-plan/       # 每日计划管理云函数
├── scripts/              # 脚本文件
│   ├── init-fsrs-database.js    # 数据库初始化
│   └── import-sample-words.js   # 示例数据导入
├── docs/                 # 文档中心
│   ├── architecture/            # 架构设计文档
│   ├── development/             # 开发相关文档
│   ├── analysis/               # 分析报告
│   ├── planning/               # 方案规划
│   └── components/             # 组件文档
├── index.html            # HTML 模板
├── tailwind.config.js    # Tailwind 配置
├── postcss.config.js     # PostCSS 配置
├── vite.config.js        # Vite 配置
└── package.json          # 项目依赖
```

## 🎯 每日学习目标使用指南

### 功能特色
- **自定义学习目标** - 设置每天要学习的新单词和复习单词数量
- **自动进度保存** - 学习进度实时保存，关闭页面后可恢复
- **智能学习计划** - 根据用户设置和学习历史生成个性化计划
- **实时进度显示** - 清晰的进度条和完成度展示

### 使用步骤
1. **设置学习目标**：
   - 进入"设置"页面
   - 调整"每日新单词数量"和"每日复习单词数量"
   - 选择预设配置（轻松/标准/强化）

2. **开始学习**：
   - 选择词书，点击"开始学习"
   - 系统自动生成今日学习计划
   - 实时显示学习进度

3. **自动保存**：
   - 每完成一个单词自动保存进度
   - 关闭页面重新打开可恢复到之前位置
   - 跨设备同步学习进度

### 预设学习模式
- **轻松模式**：新词 8个，复习 24个（适合初学者）
- **标准模式**：新词 16个，复习 48个（推荐强度）
- **强化模式**：新词 24个，复习 72个（高强度学习）

## 🎯 FSRS背单词使用指南

### 学习流程
1. **选择词书** - 在词书页面选择适合的学习材料
2. **开始学习** - 点击"开始学习"进入学习界面
3. **查看单词** - 3D翻转卡片展示单词和释义
4. **评分记忆** - 根据回忆难度选择评分（Again/Hard/Good/Easy）
5. **智能调度** - FSRS算法自动安排下次复习时间

### 评分标准
- **Again** - 完全忘记，无法回忆
- **Hard** - 想起来但很困难，犹豫很久
- **Good** - 正常回忆，用时适中
- **Easy** - 很容易想起，毫无困难

### 学习建议
- 建议每天坚持学习，形成良好习惯
- 根据个人情况调整学习量
- 重视困难单词的复习
- 查看学习统计了解进展

## 开始开发

学习页面位于 `src/pages/StudyPage.tsx`，是FSRS背单词的核心页面。FSRS算法实现在 `src/utils/fsrs.js` 中。


## 路由系统说明

本项目使用 React Router 6 作为路由系统，并采用 HashRouter 实现路由管理，这样可以更好地兼容静态网站托管服务，避免刷新页面时出现 404 错误。


### 当前路由结构

```jsx
<Router>
  <div className="flex flex-col min-h-screen">
    <main className="flex-grow">
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* 可以在这里添加新的路由 */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </main>
    <Footer />
  </div>
</Router>
```

### 如何添加新页面和路由

1. 在 `src/pages` 目录下创建新页面组件，例如 `ProductPage.jsx`：

```jsx
import React from 'react';

const ProductPage = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">产品页面</h1>
      <p>这是产品页面的内容</p>
    </div>
  );
};

export default ProductPage;
```

2. 在 `App.jsx` 中导入新页面并添加路由：

```jsx
import ProductPage from './pages/ProductPage';

// 在 Routes 中添加新路由
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/products" element={<ProductPage />} />
  <Route path="*" element={<HomePage />} />
</Routes>
```

3. 使用 Link 组件在页面中添加导航链接：

```jsx
import { Link } from 'react-router-dom';

// 在页面中添加链接
<Link to="/products" className="btn btn-primary">前往产品页面</Link>
```

### 使用路由参数

对于需要动态参数的路由，可以使用参数路径：

```jsx
// 在 App.jsx 中定义带参数的路由
<Route path="/product/:id" element={<ProductDetailPage />} />

// 在 ProductDetailPage.jsx 中获取参数
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">产品详情</h1>
      <p>产品ID: {id}</p>
    </div>
  );
};
```

### 路由导航

除了使用 `<Link>` 组件，还可以使用编程式导航：

```jsx
import { useNavigate } from 'react-router-dom';

const ComponentWithNavigation = () => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/products');
    // 或者带参数: navigate('/product/123');
    // 或者返回上一页: navigate(-1);
  };
  
  return (
    <button onClick={handleClick} className="btn btn-primary">
      前往产品页面
    </button>
  );
};
```



## 云开发功能说明

### 初始化云开发

本模板在 `src/utils/cloudbase.js` 中集中管理云开发的初始化和匿名登录功能。这个工具文件提供了云开发示例的获取/登录，调用云函数，云存储，云数据库等能力。

### 使用云数据库、云函数、云存储

通过 `src/utils/cloudbase.js` 访问云开发服务：

```jsx
import { app, ensureLogin } from '../utils/cloudbase';

// 数据库操作
await ensureLogin();
const db = app.database();
const result = await db.collection('users').get(); // 查询数据
await db.collection('users').add({ name: 'test' }); // 添加数据
// 调用云函数
const funcResult = await app.callFunction({ name: 'getEnvInfo' });
// 文件上传
const uploadResult = await app.uploadFile({ cloudPath: 'test.jpg', filePath: file });
// 数据模型
const models = app.models;
```

### 重要说明

1. 在使用前请先在 `src/utils/cloudbase.js` 文件中将 `ENV_ID` 变量的值修改为您的云开发环境 ID。
2. 本模板默认使用匿名登录，这适合快速开发和测试，但在生产环境中可能需要更严格的身份验证。
3. 所有云开发功能都通过初始化的应用实例直接调用，无需二次封装。
4. `ensureLogin` 方法会检查当前登录状态，如果已登录则返回当前登录状态，否则会进行匿名登录。
5. 匿名登录状态无法使用 `logout` 方法退出，只有其他登录方式（如微信登录、邮箱登录等）可以退出。
6. 在使用数据库、云函数、云存储等功能前，请确保在云开发控制台中已创建相应的资源。

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT
