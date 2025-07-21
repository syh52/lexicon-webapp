# WelcomeHeroCard 集成指南

## 🚀 快速开始

### 1. 安装依赖

确保你的项目已经安装了以下依赖：

```bash
npm install react react-dom
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react  # 可选：用于图标
```

### 2. 配置 Tailwind CSS

确保你的 `tailwind.config.js` 包含以下配置：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Noto Sans SC', 'Inter', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'SimSun', 'sans-serif'],
      },
      animation: {
        'blur-in': 'blur-in 0.4s ease-out forwards',
      },
      keyframes: {
        'blur-in': {
          '0%': { filter: 'blur(8px)', opacity: '0', transform: 'translateY(15px)' },
          '100%': { filter: 'blur(0px)', opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

### 3. 添加自定义 CSS 样式

在你的 `src/index.css` 或主样式文件中添加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* 中文字体支持 */
  body {
    font-family: 'Noto Sans SC', 'Inter', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'SimSun', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Glass morphism 工具类 */
  .glass-card {
    @apply bg-white/10 backdrop-blur-xl border border-white/20;
  }
  
  /* 渐变按钮 */
  .gradient-primary {
    @apply bg-gradient-to-r from-purple-600 to-blue-600;
  }
  
  /* 现代焦点样式 */
  .modern-focus {
    @apply focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900;
  }
  
  /* 透视效果 */
  .perspective-element {
    pointer-events: auto !important;
  }
}

@layer utilities {
  /* 动画延迟工具类 */
  .animate-delay-100 { animation-delay: 0.1s; }
  .animate-delay-200 { animation-delay: 0.2s; }
  .animate-delay-300 { animation-delay: 0.3s; }
  .animate-delay-400 { animation-delay: 0.4s; }
  .animate-delay-500 { animation-delay: 0.5s; }
  .animate-delay-600 { animation-delay: 0.6s; }
  
  /* 模糊入场动画 */
  @keyframes blur-in {
    from {
      filter: blur(8px);
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      filter: blur(0px);
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-blur-in {
    animation: blur-in 0.4s ease-out forwards;
    opacity: 0;
  }
}
```

### 4. 复制组件文件

将 `WelcomeHeroCard.tsx` 复制到你的项目中：

```bash
cp WelcomeHeroCard.tsx your-project/src/components/
```

### 5. 基础使用

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeHeroCard from './components/WelcomeHeroCard';

function App() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <WelcomeHeroCard
        subtitle="欢迎来到我的应用"
        title="这是一个精美的欢迎卡片"
        description="使用 Glass Morphism 设计风格"
        buttonText="开始使用"
        onButtonClick={() => navigate('/dashboard')}
      />
    </div>
  );
}

export default App;
```

## 🎨 自定义主题

### 创建主题变量

你可以通过 CSS 变量来自定义主题：

```css
:root {
  /* 主色调 */
  --primary-color: #8b5cf6;
  --secondary-color: #3b82f6;
  
  /* 背景色 */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  
  /* 文本颜色 */
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --text-accent: #c084fc;
}
```

### 使用主题色

```tsx
<WelcomeHeroCard
  title="自定义主题示例"
  className="bg-gradient-to-br from-green-500/20 to-blue-500/20"
  // ... 其他属性
/>
```

## 🔧 高级配置

### 1. 自定义动画

```tsx
// 禁用动画
<WelcomeHeroCard
  title="静态卡片"
  enableAnimation={false}
/>

// 自定义动画延迟
<WelcomeHeroCard
  title="延迟动画"
  animationDelay={500}
/>
```

### 2. 自定义按钮

```tsx
<WelcomeHeroCard
  title="自定义按钮"
  customButton={
    <div className="flex gap-4">
      <button className="px-6 py-3 bg-green-600 text-white rounded-xl">
        确认
      </button>
      <button className="px-6 py-3 bg-gray-600 text-white rounded-xl">
        取消
      </button>
    </div>
  }
/>
```

### 3. 响应式自定义

```tsx
<WelcomeHeroCard
  title="响应式标题"
  className="p-4 sm:p-8 md:p-12"  // 自定义响应式内边距
/>
```

## 🌍 多语言支持

### 设置语言内容

```tsx
const content = {
  zh: {
    subtitle: "欢迎来到LEXICON",
    title: "你们是世上的盐",
    description: "盐若失了味，怎能叫它再咸呢？ —— 《马太福音》5:13",
    buttonText: "开始学习之旅"
  },
  en: {
    subtitle: "Welcome to LEXICON",
    title: "You are the salt of the earth",
    description: "But if the salt loses its saltiness, how can it be made salty again? — Matthew 5:13",
    buttonText: "Start Your Journey"
  }
};

function MultiLanguageCard() {
  const [language, setLanguage] = React.useState<'zh' | 'en'>('zh');
  
  return (
    <WelcomeHeroCard
      subtitle={content[language].subtitle}
      title={content[language].title}
      description={content[language].description}
      buttonText={content[language].buttonText}
      onButtonClick={() => console.log('语言:', language)}
    />
  );
}
```

## 📱 移动端优化

### 确保触摸友好

```tsx
<WelcomeHeroCard
  title="移动端优化"
  className="touch-manipulation"  // 优化触摸响应
  buttonText="点击我"
  onButtonClick={() => {
    // 添加触觉反馈（如果支持）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }}
/>
```

### 优化字体大小

在小屏设备上，你可能需要调整字体大小：

```css
@media (max-width: 375px) {
  .welcome-hero-card .title {
    font-size: 1rem; /* 16px */
  }
}
```

## 🎯 性能优化

### 1. 懒加载

```tsx
import React, { lazy, Suspense } from 'react';

const WelcomeHeroCard = lazy(() => import('./components/WelcomeHeroCard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WelcomeHeroCard title="懒加载示例" />
    </Suspense>
  );
}
```

### 2. 减少重新渲染

```tsx
import React, { memo } from 'react';

const OptimizedWelcomeHeroCard = memo(WelcomeHeroCard);

// 使用 memo 版本
<OptimizedWelcomeHeroCard
  title="优化版本"
  enableAnimation={false}  // 在性能敏感场景禁用动画
/>
```

## 🐛 常见问题

### 1. 动画不工作

确保你的 CSS 包含了动画关键帧：

```css
@keyframes blur-in {
  from {
    filter: blur(8px);
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    filter: blur(0px);
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 2. 字体渲染问题

确保安装了必要的字体或使用 web fonts：

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap" rel="stylesheet">
```

### 3. 按钮点击无响应

检查是否有其他元素阻挡了点击事件：

```css
.perspective-element {
  pointer-events: auto !important;
}
```

## 🔄 迁移指南

### 从旧版本迁移

如果你之前使用的是硬编码的 Hero 区域，可以这样迁移：

```tsx
// 旧版本
<div className="hero-section">
  <h1>欢迎来到LEXICON</h1>
  <p>说明文字</p>
  <button>开始使用</button>
</div>

// 新版本
<WelcomeHeroCard
  subtitle="欢迎来到LEXICON"
  title="说明文字"
  buttonText="开始使用"
  onButtonClick={handleClick}
/>
```

## 📞 支持

如果你在使用过程中遇到问题，可以：

1. 查看组件的 TypeScript 类型定义
2. 参考 `WelcomeHeroCard.examples.tsx` 中的示例
3. 检查浏览器控制台的错误信息
4. 确保所有必要的依赖都已正确安装

## 📝 许可证

本组件基于 MIT 许可证，可自由使用和修改。