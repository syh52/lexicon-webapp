# WelcomeHeroCard 组件设计规格文档

## 🎨 设计概述

`WelcomeHeroCard` 是一个采用 **Glass Morphism** 设计风格的现代化欢迎卡片组件。它是从 LEXICON 项目首页中提取的最满意的设计元素，具有优雅的视觉效果和完美的响应式布局。

## 📐 详细设计规格

### 字体系统 (Typography)

#### 字体栈 (Font Stack)
```css
font-family: 'Noto Sans SC', 'Inter', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'SimSun', sans-serif;
```

#### 字体渲染优化
- **抗锯齿**: `-webkit-font-smoothing: antialiased`
- **macOS优化**: `-moz-osx-font-smoothing: grayscale`

#### 文本层次结构

| 元素 | 移动端 | 小屏平板 | 桌面端 | 字重 | 行高 | 字间距 |
|------|--------|----------|--------|------|------|--------|
| 小标题 | 12px (text-xs) | 14px (text-sm) | 14px (text-sm) | 500 (medium) | 默认 | tracking-wide |
| 主标题 | 18px (text-lg) | 20px (text-xl) | 24px (text-2xl) | 600 (semibold) | 1.625 (leading-relaxed) | tracking-tight |
| 副标题 | 12px (text-xs) | 14px (text-sm) | 14px (text-sm) | 400 (normal) | 默认 | 默认 |
| 按钮文本 | 14px (text-sm) | 16px (text-base) | 16px (text-base) | 500 (medium) | 默认 | 默认 |

### 颜色系统 (Color System)

#### 主要颜色
- **小标题**: `text-purple-400` (#c084fc)
- **主标题**: `text-white` (#ffffff)
- **副标题**: `text-gray-400` (#9ca3af)
- **按钮文本**: `text-white` (#ffffff)

#### 背景与效果
- **卡片背景**: `bg-white/10` (白色 10% 不透明度)
- **模糊效果**: `backdrop-blur-xl` (24px)
- **边框**: `border-white/20` (白色 20% 不透明度)
- **渐变背景**: `from-purple-500/20 to-blue-500/20`
- **按钮背景**: `gradient-primary` (紫色到蓝色渐变)

### 间距系统 (Spacing System)

#### 外边距 (Padding)
响应式内边距遵循 **移动优先** 原则：

| 断点 | 内边距 | 像素值 |
|------|--------|--------|
| 基础 (默认) | `p-6` | 24px |
| sm (≥640px) | `sm:p-8` | 32px |
| md (≥768px) | `md:p-10` | 40px |

#### 内部间距 (Margin)
垂直间距采用渐进式设计：

| 元素间距 | 移动端 | 桌面端 | 像素值 (移动/桌面) |
|----------|--------|--------|-------------------|
| 小标题 → 主标题 | `mb-3` | `sm:mb-4` | 12px / 16px |
| 主标题 → 副标题 | `mb-4` | `sm:mb-6` | 16px / 24px |
| 副标题 → 按钮 | `mb-6` | `sm:mb-8` | 24px / 32px |

#### 按钮间距
- **内边距**: `py-3.5 px-6` (纵向14px，横向24px)
- **响应式宽度**: `sm:px-12` (桌面端横向48px)
- **宽度控制**: 移动端全宽 `w-full`，桌面端自适应 `sm:w-auto`

### 圆角系统 (Border Radius)

| 元素 | 圆角值 | 像素值 |
|------|--------|--------|
| 卡片容器 | `rounded-3xl` | 24px |
| 按钮 | `rounded-2xl` | 16px |

### 动画效果 (Animation)

#### 入场动画
- **动画名称**: `animate-blur-in`
- **持续时间**: 0.4s
- **缓动函数**: ease-out
- **延迟**: 可配置 (默认 200ms)

#### 动画关键帧
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

#### 交互动画
- **悬停效果**: `hover:scale-105` (放大到 1.05 倍)
- **点击效果**: `active:scale-95` (缩小到 0.95 倍)
- **过渡时间**: `transition-all duration-200`

### 响应式断点 (Responsive Breakpoints)

| 断点 | 最小宽度 | 主要用途 |
|------|----------|----------|
| 基础 | 0px | 移动端设计 |
| sm | 640px | 小屏平板 |
| md | 768px | 桌面端 |

### 视觉层次 (Visual Hierarchy)

#### Z-Index 层级
- **背景模糊层**: `absolute inset-0` (最底层)
- **主要内容**: `relative` (顶层)

#### 透明度层级
- **背景模糊**: 20% 不透明度
- **卡片背景**: 10% 不透明度
- **边框**: 20% 不透明度

## 🛠️ 技术实现

### CSS 工具类依赖

#### 自定义工具类
```css
/* Glass Morphism 效果 */
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
```

#### 所需 Tailwind 配置
```javascript
// tailwind.config.js
module.exports = {
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
}
```

## 📱 设备兼容性

### 支持的设备类型
- ✅ **移动设备**: 320px - 767px
- ✅ **平板设备**: 768px - 1023px  
- ✅ **桌面设备**: 1024px+

### 浏览器支持
- ✅ Chrome 88+
- ✅ Firefox 78+
- ✅ Safari 14+
- ✅ Edge 88+

### 性能优化
- **GPU 加速**: 使用 `transform` 而非 `position` 变化
- **模糊优化**: `backdrop-blur-xl` 在支持的浏览器中启用
- **字体加载**: 使用 `font-display: swap` 优化字体加载

## 🎯 使用建议

### 最佳实践
1. **内容长度**: 主标题建议控制在 2-3 行以内
2. **按钮文本**: 建议使用动词开头，如"开始"、"立即"、"马上"
3. **动画使用**: 在性能敏感场景可禁用动画
4. **可访问性**: 确保按钮有合适的焦点状态

### 常见问题
1. **字体渲染**: 确保系统已安装思源黑体或微软雅黑
2. **动画卡顿**: 在低端设备上可以禁用 `enableAnimation`
3. **内容溢出**: 长文本会自动换行，但建议控制内容长度

## 📄 许可证

本组件遵循 MIT 许可证，可自由使用和修改。