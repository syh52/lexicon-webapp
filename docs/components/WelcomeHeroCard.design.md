# WelcomeHeroCard 设计规范文档

这是对您最满意的UI组件的完整设计分析和技术规范。

## 🎨 设计理念

这个组件采用了现代的 **Glass Morphism** 设计风格，营造出一种优雅的透明玻璃质感，符合现代UI设计趋势。

## 📏 详细设计参数

### 1. 字体系统 (Typography)

#### 字体族 (Font Family)
```css
font-family: 'Noto Sans SC', 'Inter', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'SimSun', sans-serif;
```

**设计意图**: 优先使用现代无衬线字体，确保中英文混排的最佳显示效果

#### 字体大小层次 (Font Size Hierarchy)
- **小标题 (Subtitle)**: 
  - 移动端: `12px` (text-xs)
  - 桌面端: `14px` (text-sm)
  - 字重: `500` (font-medium)

- **主标题 (Title)**:
  - 移动端: `18px` (text-lg)
  - 平板端: `20px` (text-xl)
  - 桌面端: `24px` (text-2xl)
  - 字重: `600` (font-semibold)

- **副标题 (Description)**:
  - 移动端: `12px` (text-xs)
  - 桌面端: `14px` (text-sm)
  - 字重: `400` (font-normal)

#### 字体渲染优化
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### 2. 颜色系统 (Color System)

#### 主要颜色 (Primary Colors)
- **小标题**: `#c084fc` (text-purple-400)
- **主标题**: `#ffffff` (text-white)
- **副标题**: `#9ca3af` (text-gray-400)

#### 背景颜色 (Background Colors)
- **玻璃卡片**: `rgba(255, 255, 255, 0.1)` (bg-white/10)
- **边框**: `rgba(255, 255, 255, 0.2)` (border-white/20)
- **渐变背景**: 
  - 起始: `rgba(168, 85, 247, 0.2)` (from-purple-500/20)
  - 结束: `rgba(59, 130, 246, 0.2)` (to-blue-500/20)

#### 按钮颜色 (Button Colors)
- **主按钮**: 紫色到蓝色渐变 (gradient-primary)
  - 起始: `#9333ea` (from-purple-600)
  - 结束: `#2563eb` (to-blue-600)

### 3. 间距系统 (Spacing System)

#### 外边距 (Padding) - 响应式
- **移动端**: `24px` (p-6)
- **平板端**: `32px` (sm:p-8)
- **桌面端**: `40px` (md:p-10)

#### 内部间距 (Margin) - 垂直间距
- **小标题到主标题**: 
  - 移动端: `12px` (mb-3)
  - 桌面端: `16px` (sm:mb-4)
  
- **主标题到副标题**: 
  - 移动端: `16px` (mb-4)
  - 桌面端: `24px` (sm:mb-6)
  
- **副标题到按钮**: 
  - 移动端: `24px` (mb-6)
  - 桌面端: `32px` (sm:mb-8)

### 4. 圆角系统 (Border Radius)

- **卡片圆角**: `24px` (rounded-3xl)
- **按钮圆角**: `16px` (rounded-2xl)

### 5. 阴影与模糊效果 (Shadow & Blur)

#### 背景模糊 (Backdrop Blur)
- **模糊强度**: `24px` (backdrop-blur-xl)
- **模糊层**: 使用 `blur-sm` 创建渐变背景的柔和效果

#### 阴影效果 (Box Shadow)
- **按钮阴影**: `shadow-lg` (0 10px 15px -3px rgba(0, 0, 0, 0.1))

### 6. 动画系统 (Animation System)

#### 进入动画 (Entry Animation)
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

- **动画时长**: `0.4s` (ease-out)
- **默认延迟**: `0.2s` (animate-delay-200)

#### 交互动画 (Interaction Animation)
- **悬停效果**: `scale(1.05)` (hover:scale-105)
- **点击效果**: `scale(0.95)` (active:scale-95)
- **过渡时长**: `0.2s` (duration-200)

### 7. 响应式断点 (Responsive Breakpoints)

- **基础 (Base)**: `0px` - 适用于所有尺寸
- **sm (Small)**: `640px` 及以上
- **md (Medium)**: `768px` 及以上

### 8. 视觉层次 (Visual Hierarchy)

#### Z-Index 层次
- **背景渐变层**: `z-index: auto` (绝对定位)
- **内容层**: `z-index: auto` (相对定位)
- **按钮层**: `z-index: 10` (确保可点击)

#### 透明度层次
- **背景卡片**: `10%` 不透明度
- **渐变背景**: `20%` 不透明度
- **边框**: `20%` 不透明度

## 🔧 技术实现细节

### CSS 类依赖
组件依赖以下自定义 CSS 类：
- `glass-card`: 玻璃态效果
- `gradient-primary`: 主要渐变色
- `modern-focus`: 现代焦点样式
- `perspective-element`: 3D 透视效果
- `animate-blur-in`: 进入动画
- `animate-delay-200`: 动画延迟

### 无障碍性 (Accessibility)
- 支持键盘导航
- 合理的颜色对比度
- 语义化的HTML结构
- 适当的焦点管理

### 性能优化
- 使用 CSS Transform 而非改变位置属性
- 利用 `will-change` 属性优化动画性能
- 避免重绘和重排

## 🎯 使用指南

### 基础使用
```tsx
<WelcomeHeroCard
  title="欢迎来到您的应用"
  description="开始您的学习之旅"
  onButtonClick={() => navigate('/start')}
/>
```

### 高级定制
```tsx
<WelcomeHeroCard
  subtitle="自定义副标题"
  title="您的主要标题"
  description="详细描述文本"
  buttonText="自定义按钮文本"
  onButtonClick={handleCustomClick}
  enableAnimation={false}  // 禁用动画
  className="custom-spacing"  // 自定义样式
/>
```

### 自定义按钮
```tsx
<WelcomeHeroCard
  title="主标题"
  showButton={true}
  customButton={
    <div className="flex gap-4">
      <button className="btn-primary">登录</button>
      <button className="btn-secondary">注册</button>
    </div>
  }
/>
```

## 📱 响应式行为

### 移动端 (< 640px)
- 卡片内边距: 24px
- 按钮宽度: 100% (w-full)
- 字体大小: 较小尺寸

### 平板端 (640px - 768px)
- 卡片内边距: 32px
- 按钮宽度: 自适应 (w-auto)
- 字体大小: 中等尺寸

### 桌面端 (> 768px)
- 卡片内边距: 40px
- 按钮最小宽度: 192px (px-12)
- 字体大小: 最大尺寸

## 🎨 设计变体

### 主题变体
可以通过修改 CSS 变量来创建不同的主题：

```css
/* 蓝色主题 */
.hero-card-blue {
  --primary-color: #3b82f6;
  --accent-color: #60a5fa;
}

/* 绿色主题 */
.hero-card-green {
  --primary-color: #10b981;
  --accent-color: #34d399;
}
```

### 尺寸变体
```tsx
// 紧凑版本
<WelcomeHeroCard
  title="标题"
  className="compact-version"
  // 自定义CSS: .compact-version { padding: 16px; }
/>

// 扩展版本
<WelcomeHeroCard
  title="标题"
  className="extended-version"
  // 自定义CSS: .extended-version { padding: 60px; }
/>
```

## 🚀 最佳实践

1. **内容长度**: 主标题建议不超过 2 行，副标题不超过 3 行
2. **动画性能**: 在低性能设备上可以禁用动画
3. **主题一致性**: 确保颜色与整体设计系统保持一致
4. **响应式测试**: 在不同设备上测试文本换行和布局
5. **无障碍性**: 确保足够的颜色对比度和键盘导航支持

这个组件体现了现代 Web 设计的最佳实践，结合了视觉美学和用户体验的完美平衡。 