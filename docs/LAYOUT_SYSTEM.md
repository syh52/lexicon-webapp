# Lexicon UI 布局系统规范

## 📐 层级架构原则

### 全局布局层级

```
App
└── AppLayout (全局背景管理)
    ├── 状态栏占位: h-[34px]
    ├── MobileHeader (导航栏)
    ├── Main Content (页面内容区域)
    └── MobileNavigation (底部导航，仅首页)
```

### 背景管理规范

#### ✅ 正确的背景设置

```tsx
// 1. 全局基础背景 - 只在 AppLayout 中设置
AppLayout: BACKGROUNDS.PRIMARY (bg-gray-900)

// 2. 页面组件 - 不设置背景，继承全局样式
HomePage: ✅ 无背景设置
StudyPage: ✅ 无背景设置  
WordbooksPage: ✅ 无背景设置

// 3. 特殊页面 - 可使用 FULLSCREEN 常量
AuthPage: BACKGROUNDS.FULLSCREEN (独立布局)
```

#### ❌ 错误的背景设置

```tsx
// 不要在页面组件中重复设置背景
StudyPage: bg-gray-900  // ❌ 重复设置
AdminPage: bg-gray-900  // ❌ 重复设置
```

## 🎨 设计系统使用

### 导入设计常量

```tsx
import { BACKGROUNDS, GRADIENTS, BORDERS, TEXT_COLORS } from '../constants/design';
```

### 背景使用场景

| 背景类型 | 使用场景 | 示例 |
|---------|---------|------|
| `BACKGROUNDS.PRIMARY` | 全局主背景，只在AppLayout使用 | `bg-gray-900` |
| `BACKGROUNDS.FULLSCREEN` | 独立页面（登录/错误页） | `min-h-screen bg-gray-900` |
| `BACKGROUNDS.CARD` | 透明卡片背景 | `bg-white/5` |
| `GRADIENTS.SUBTLE` | 微妙装饰效果 | `bg-gradient-to-br from-purple-500/3 to-blue-500/3` |

## 🚨 开发规范

### 必检清单

开发任何新页面前必须检查：

- [ ] 是否添加了不必要的背景设置？
- [ ] 是否正确使用了设计系统常量？
- [ ] 页面是否正确继承了AppLayout的背景？
- [ ] 是否避免了多层背景嵌套？

### 组件职责分工

#### AppLayout 职责
- ✅ 设置全局基础背景
- ✅ 管理导航栏和布局结构
- ✅ 处理不同路径的布局模式

#### 页面组件职责
- ✅ 只管理页面内容
- ✅ 使用设计系统常量
- ❌ 不设置重复背景

#### 卡片组件职责
- ✅ 使用 `BACKGROUNDS.CARD` 系列
- ✅ 提供内容的视觉分层

## 📋 故障排除

### 常见问题及解决方案

#### 问题1：页面出现多层背景
```tsx
// ❌ 错误示例
<div className="min-h-screen bg-gray-900">  // AppLayout已设置
  <div className="bg-gray-900">             // 重复设置
    内容
  </div>
</div>

// ✅ 正确示例
<div className="min-h-screen">              // 继承AppLayout背景
  <div className={BACKGROUNDS.CARD}>        // 使用设计系统
    内容
  </div>
</div>
```

#### 问题2：AuthPage设计不一致
```tsx
// ❌ 错误：多层复杂渐变
<div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
  <div className="bg-gray-900">
    内容
  </div>
</div>

// ✅ 正确：简洁统一设计
<div className={BACKGROUNDS.FULLSCREEN}>
  <div className={GRADIENTS.SUBTLE}>
    内容
  </div>
</div>
```

## 🏆 最佳实践

### 1. 单一职责原则
- **AppLayout**: 负责全局布局和背景
- **页面组件**: 负责内容展示
- **卡片组件**: 负责内容分组

### 2. 继承优于重复
- 优先使用CSS继承
- 避免重复的样式声明
- 使用设计系统常量

### 3. 装饰效果分离
- 基础背景与装饰渐变分离
- 谨慎使用复杂背景效果
- 保持视觉的一致性

## 🔄 维护指南

### 定期检查
- 每月检查是否有新的重复背景设置
- 确保新页面遵循设计规范
- 及时更新设计系统常量

### 重构原则
- 发现重复立即重构
- 保持代码的简洁性
- 维护设计的一致性

---

**记住**: 好的布局系统应该是**简单、一致、可维护**的。避免"看起来能工作"的代码，追求**工程师的职业品质**！