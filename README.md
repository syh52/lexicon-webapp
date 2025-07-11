# Lexicon 背单词 WebApp

一个基于云开发的现代化英语背单词应用，采用FSRS智能复习算法，帮助用户高效记忆单词。


[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 🚀 项目概述

**Lexicon** 是为吉祥航空航空安保部安全员设计的英语学习工具，支持碎片化、常态化学习，提供个性化的单词复习体验。

### 主要功能

- ✅ **用户认证系统** - 支持邮箱注册/登录和匿名登录
- ✅ **词书管理** - 预置基础英语词汇库（50个词汇）
- ✅ **智能复习** - 集成FSRS算法，优化记忆曲线
- ✅ **学习统计** - 详细的学习进度和成就系统
- ✅ **响应式设计** - 适配桌面和移动设备
- ✅ **暗色主题** - 现代化毛玻璃效果界面

## 项目架构

### 前端架构

- **框架**：React 18
- **构建工具**：Vite
- **路由**：React Router 6（使用 HashRouter）
- **样式**：Tailwind CSS + DaisyUI
- **动画**：Framer Motion

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源：

- **身份认证**：用于用户登录和身份验证
- **云数据库**：存储用户学习记录、单词本、学习进度等数据
- **云函数**：实现AI评估、学习分析、数据处理等业务逻辑
- **云存储**：存储音频文件、图片等学习资源
- **云托管**：用于部署前端应用（容器化部署）
- **AI能力**：集成云开发AI服务，提供智能学习建议和评估

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

### 本地测试云托管环境

```bash
npm run start
```

## 部署指南

### 部署到云开发云托管

项目已配置云托管支持，可通过以下方式部署：

#### 方式一：使用 CloudBase CLI 自动部署
```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录云开发
cloudbase login

# 部署到云托管
cloudbase framework deploy
```

#### 方式二：手动构建Docker镜像
```bash
# 构建Docker镜像
docker build -t lexicon-app .

# 本地测试
docker run -p 3000:3000 lexicon-app
```

#### 云托管配置说明
- **服务名称**: lexicon-app
- **访问路径**: /lexicon
- **容器端口**: 3000
- **自动构建**: 支持从代码仓库自动构建和部署

### 🚀 在线体验

项目已部署到云开发云托管，可直接访问体验：

**[在线体验地址](https://lexicon-app-xxxx.app.tcloudbase.com/lexicon)** (部署后自动生成)

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
│   ├── pages/            # 页面组件
│   ├── utils/            # 工具函数和云开发初始化
│   ├── App.jsx           # 应用入口
│   ├── main.jsx          # 渲染入口
│   └── index.css         # 全局样式
├── index.html            # HTML 模板
├── tailwind.config.js    # Tailwind 配置
├── postcss.config.js     # PostCSS 配置
├── vite.config.js        # Vite 配置
└── package.json          # 项目依赖
```

## 开始开发

首页位于 `src/pages/HomePage.jsx`，是应用的默认入口页面。您可以根据项目需求自定义首页内容。


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
