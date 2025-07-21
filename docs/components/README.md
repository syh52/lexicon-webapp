# 🧩 组件文档

本目录包含项目中可复用组件的详细文档。

## 📋 组件列表

### WelcomeHeroCard 欢迎卡片组件
- [`WelcomeHeroCard.md`](./WelcomeHeroCard.md) - 组件详细设计文档
- [`WelcomeHeroCard.design.md`](./WelcomeHeroCard.design.md) - 设计规格说明
- [`WelcomeHeroCard.examples.tsx`](./WelcomeHeroCard.examples.tsx) - 使用示例代码
- [`WelcomeHeroCard.README.md`](./WelcomeHeroCard.README.md) - 集成指南

## 🎨 设计特色

### Glass Morphism 风格
- 背景模糊效果
- 透明度层次设计
- 渐变色彩应用

### 响应式设计
- 移动端适配
- 平板端优化
- 桌面端最佳体验

### 动画效果
- 平滑入场动画
- 交互反馈动画
- 性能优化的GPU加速

## 🔧 技术规范

### 开发标准
- TypeScript类型支持
- React Hooks使用
- Tailwind CSS样式
- 无障碍访问支持

### 代码质量
- 完整的JSDoc注释
- 单元测试覆盖
- 性能优化配置
- 错误处理机制

## 📚 使用指南

### 基础使用
```tsx
import { WelcomeHeroCard } from './components/WelcomeHeroCard';

<WelcomeHeroCard
  title="欢迎使用Lexicon"
  subtitle="开始您的英语学习之旅"
  onButtonClick={() => navigate('/study')}
/>
```

### 自定义配置
- 支持自定义按钮内容
- 可配置动画效果
- 支持主题色彩定制

## 🔄 维护指南

- 遵循项目的UI设计规范
- 保持组件的向后兼容性
- 及时更新文档和示例
- 定期进行性能优化

## 📞 技术支持

如需组件定制或问题反馈，请联系开发团队。