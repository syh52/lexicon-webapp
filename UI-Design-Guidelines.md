# 📐 UI 视觉一致性规范

> 确保所有开发成员在实现界面时保持统一的外观与体验。

## 🎨 色彩系统

核心配色以深灰背景配合品牌渐变色，文字对比度应满足 **AA 级可读性**。

### 基础色彩

```css
/* 灰色系统 */
--gray-900: #0F172A;    /* 主背景色 */
--gray-800: #1E293B;    /* 次级背景 */
--gray-700: #374151;    /* 卡片背景 */

/* 品牌色彩 */
--purple-500: #8B5CF6;  /* 主要品牌色 */
--blue-500: #3B82F6;    /* 次要品牌色 */
```

### 色彩应用原则

- **主背景**: 使用 `gray-900` 作为页面主背景
- **卡片/容器**: 使用 `gray-800` 或 `gray-700` 
- **强调元素**: 使用 `purple-500` 到 `blue-500` 的渐变
- **文本**: 白色文本确保在深色背景上的可读性

## 🔤 字体与排版

### 字体家族
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

### 字重规范
- **标题字重**: `Semibold` (600)
- **正文字重**: `Regular` (400)

### 排版规则
- **字符间距**: 20px 以上标题使用 `tracking-tight` 减小字间距提升清晰度
- **行高**: 使用 `leading-relaxed` 保持阅读舒适度

```css
/* 标题样式 */
.heading {
  font-weight: 600;
  letter-spacing: -0.025em; /* tracking-tight */
}

/* 正文样式 */
.body-text {
  font-weight: 400;
  line-height: 1.625; /* leading-relaxed */
}
```

## 🧩 组件规范

### 按钮设计

#### 主要按钮
```css
.primary-button {
  /* 基础样式 */
  border-radius: 8px;        /* rounded-lg */
  padding: 10px 44px;        /* 高度保持 40-44px */
  
  /* 交互状态 */
  transition: all 0.3s ease;
  
  /* 悬停效果 */
  &:hover {
    opacity: 0.9;
    background: linear-gradient(135deg, var(--purple-500), var(--blue-500));
  }
  
  /* 焦点样式 */
  &:focus {
    ring: 2px solid var(--purple-500);
    ring-offset: 2px;
  }
}
```

#### 次要按钮
```css
.secondary-button {
  background: var(--gray-700);
  border-radius: 8px;
  padding: 10px 44px;
  
  &:hover {
    background: var(--gray-600);
  }
}
```

### 卡片设计

#### 示例单词卡片
```css
.word-card {
  /* 基础样式 */
  background: var(--gray-800);
  border-radius: 12px;        /* rounded-xl */
  
  /* 卡片内容居中对齐，标题字距微调 */
  .card-title {
    text-align: center;
    letter-spacing: -0.025em;
  }
  
  /* 可选微效果 */
  &:hover {
    transform: scale(1.05);
    transition: transform 0.15s ease;
  }
}
```

## ♿ 可访问性与微交互

### 无障碍访问
- **语义化标签**: 所有交互元素必须包含 `aria-label` 或可访问文本
- **焦点可视化**: 使用品牌色 `#8B5CF6` 作为 `ring` 颜色
- **动画持续时间**: `150-200ms` 遵循用户动效偏好

### 交互反馈
```css
/* 全局动画设置 */
* {
  transition-duration: 150ms;
}

/* 焦点环设置 */
.focusable:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--purple-500);
}

/* 语义化优化 */
button, nav, main {
  /* 确保语义标签正确使用以提升 SEO */
}
```

## 📏 网格与间距

### 基础网格系统
```css
/* 基础单位: 8px */
--space-1: 0.5rem;  /* 8px */
--space-2: 1rem;    /* 16px */
--space-4: 2rem;    /* 32px */
--space-6: 3rem;    /* 48px */
```

### 布局约束
- **主要内容宽度**: `max-w-4xl` 限制最大宽度
- **内边距**: `px-6` 保持适当的功能留白
- **段落间距**: `space-y-6` 节间距
- **行间距**: `space-y-16` 大段落间距

### 响应式间距
```css
/* 移动端 */
@media (max-width: 768px) {
  .container {
    padding: var(--space-4);
  }
}

/* 桌面端 */
@media (min-width: 769px) {
  .container {
    padding: var(--space-6);
  }
}
```

## 🎯 实施检查清单

### 开发前检查
- [ ] 确认色彩使用符合规范
- [ ] 字体加载和字重设置正确
- [ ] 组件符合设计规范
- [ ] 可访问性标签完整

### 代码审查要点
- [ ] 是否使用了统一的设计 token
- [ ] 交互动画时长是否符合规范
- [ ] 焦点状态是否清晰可见
- [ ] 响应式布局是否正确

### 测试标准
- [ ] 在不同设备上的视觉一致性
- [ ] 键盘导航的可访问性
- [ ] 颜色对比度测试通过
- [ ] 动画性能优化

## 💡 常见问题解答

### Q: 如何确保颜色对比度？
A: 使用在线工具测试文本与背景的对比度，确保达到 WCAG AA 标准（对比度 ≥ 4.5:1）。

### Q: 可以自定义组件样式吗？
A: 可以，但必须遵循基础的色彩、字体和间距规范。变化应该在组件的功能表现上，而非基础视觉风格。

### Q: 如何处理深色模式？
A: 当前规范已基于深色主题设计，如需适配浅色模式，需要创建对应的色彩变量映射。

---

**重要提醒**: 任何对本规范的修改都应该通过团队讨论达成一致，确保整个产品的视觉一致性。

_保持一致，创造优秀的用户体验 ✨_ 