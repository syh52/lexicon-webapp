# Lexicon 智能英语学习平台

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

一个基于云开发的现代化英语学习Web应用，采用SM2间隔重复算法、AI语音助手、实时对话和智能学习管理，为用户提供科学高效的英语学习体验。

## 🚀 在线体验

**生产环境**: [https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com](https://cloud1-7g7oatv381500c81-1367168150.tcloudbaseapp.com)

> 📅 最后部署: 2025-07-30  
> ✅ 状态: 正常运行  
> 🔧 版本: v2.0.0  
> 🎯 环境: cloud1-7g7oatv381500c81

## ✨ 核心功能

### 🎓 智能学习系统
- ✅ **SM2算法背单词** - 基于科学的SuperMemo 2间隔重复算法，三档评分(知道/提示/不知道)
- ✅ **个性化学习计划** - 根据记忆曲线动态调整复习间隔和难度
- ✅ **多维度进度追踪** - 详细的学习统计、掌握程度和复习建议
- ✅ **词书管理系统** - 支持自定义词书上传(CSV/JSON格式)和管理

### 🤖 AI语音助手
- ✅ **实时语音对话** - 基于OpenAI Realtime API的流畅对话体验
- ✅ **智能语音识别** - 高精度的语音转文本功能(OpenAI Whisper)
- ✅ **多场景对话练习** - 情景对话、发音练习、词汇学习
- ✅ **语音合成播放** - 自然流畅的AI语音播放(OpenAI TTS)

### 🔐 用户管理
- ✅ **完善认证系统** - 支持邮箱注册/登录 + 匿名快速体验
- ✅ **管理员系统** - 用户管理、密钥生成、数据统计
- ✅ **个人资料管理** - 学习偏好设置和数据同步

### 📱 现代化界面
- ✅ **Glass Morphism设计** - 现代毛玻璃美学风格
- ✅ **响应式设计** - 完美适配桌面和移动设备
- ✅ **流畅动画效果** - 自然的交互反馈和页面过渡(Framer Motion)
- ✅ **深色主题** - 护眼的深色配色方案

## 🛠 技术架构

### 前端技术栈
```
React 18 + TypeScript     现代化组件开发
Vite 6.3.5                极速构建工具  
React Router 6            单页应用路由管理
Tailwind CSS + DaisyUI    原子化CSS框架
Framer Motion             流畅动画效果
Lucide React              现代图标库
```

### 云开发资源架构
```
📦 云数据库集合
├── users                 用户基础信息
├── user_settings         用户学习偏好配置
├── daily_study_plans     每日学习计划数据
├── study_records         学习记录和SM2参数
├── wordbooks            词书管理数据
├── words                单词数据
└── admin_keys           管理员密钥管理

🔧 云函数服务 (15个)
├── ai-chat              AI对话服务(GPT-4o-mini)
├── speech-recognition   语音识别服务(OpenAI Whisper)
├── text-to-speech       语音合成服务(OpenAI TTS)
├── realtime-proxy       实时语音代理(OpenAI Realtime API)
├── voice-assistant      语音助手服务
├── dictionary-lookup    词典查询服务
├── learning-tracker     学习进度追踪
├── sm2-service          SM2算法服务
├── daily-plan          每日计划管理
├── user-settings       用户设置管理
├── userInfo            用户信息服务
├── getWordbooks        词书列表获取
├── getWordsByWordbook  词书内容获取
├── upload-wordbook     词书上传服务
└── admin-management    管理员功能

🌐 静态网站托管
└── dist/               生产构建产物部署
```

### 核心算法与AI集成
- **SM2算法** - SuperMemo 2间隔重复算法，支持三档评分系统(知道/提示/不知道)
- **OpenAI GPT-4o-mini** - 智能对话和内容生成
- **OpenAI Whisper** - 高精度语音识别
- **OpenAI TTS** - 自然语音合成
- **OpenAI Realtime API** - 实时语音对话

## 📁 项目结构

```
lexicon-webapp/
├── 📱 前端应用 (src/)
│   ├── pages/                   页面组件
│   │   ├── HomePage.tsx          首页
│   │   ├── StudyPage.tsx         学习页面
│   │   ├── WordbooksPage.tsx     词书管理
│   │   ├── VoiceAssistantPage.jsx 语音助手
│   │   ├── ProfilePage.tsx       用户资料
│   │   ├── StatsPage.tsx         学习统计
│   │   ├── AdminPage.tsx         管理员页面
│   │   └── AuthPage.tsx          认证页面
│   │
│   ├── components/               可复用组件
│   │   ├── study/               学习相关组件
│   │   ├── voice/               语音相关组件
│   │   ├── upload/              上传相关组件
│   │   ├── admin/               管理员组件
│   │   ├── auth/                认证组件
│   │   └── ui/                  基础UI组件
│   │
│   ├── services/                业务逻辑服务
│   │   ├── sm2Service.ts         SM2算法服务
│   │   ├── DailyPlanGenerator.ts  学习计划生成
│   │   ├── wordbookService.ts    词书管理服务
│   │   ├── userSettingsService.ts 用户设置服务
│   │   └── ...                  其他服务
│   │
│   ├── utils/                   工具函数
│   │   ├── cloudbase.ts         云开发初始化
│   │   ├── sm2Algorithm.ts      SM2算法实现
│   │   └── ...                  其他工具
│   │
│   ├── contexts/                React上下文
│   │   └── AuthContext.tsx      认证状态管理
│   │
│   ├── hooks/                   自定义Hook
│   │   ├── useRealtimeSession.js     实时会话Hook
│   │   └── useRealtimeSessionHTTP.js HTTP会话Hook
│   │
│   ├── types/                   TypeScript类型定义
│   └── assets/                  静态资源

├── ☁️ 云函数 (cloudfunctions/)
│   ├── ai-chat/                 AI对话服务
│   ├── speech-recognition/      语音识别
│   ├── text-to-speech/         语音合成
│   ├── realtime-proxy/         实时语音代理
│   ├── voice-assistant/        语音助手
│   ├── sm2-service/            SM2算法服务
│   ├── learning-tracker/       学习追踪
│   ├── daily-plan/             学习计划管理
│   ├── dictionary-lookup/      词典查询
│   ├── user-settings/          用户设置
│   ├── admin-management/       管理员功能
│   ├── userInfo/               用户信息
│   ├── getWordbooks/           词书列表
│   ├── getWordsByWordbook/     词书内容
│   └── upload-wordbook/        词书上传

├── 📚 文档 (docs/)
│   ├── testing-guide.md        测试指南
│   ├── voice-assistant-plan1-simple.md   语音助手方案1
│   └── voice-assistant-plan2-custom.md   语音助手方案2

├── 🔧 脚本工具 (scripts/)
│   └── deploy-check.js         部署检查脚本

├── 🌍 静态资源 (public/)
│   ├── audioProcessor.js       音频处理器
│   ├── fonts/                  字体文件
│   └── test.html              测试页面

├── 📖 项目文档
│   ├── README.md               项目说明文档 (本文件)
│   ├── UI_DESIGN_GUIDE.md      UI设计指南
│   ├── VOICE_RECOGNITION_FIX.md  语音识别修复指南
│   ├── CloudBase-MCP部署规范.md   部署规范
│   ├── 部署最佳实践指南.md        部署指南
│   └── 云函数配置说明.md         云函数配置
│
└── 🛠 配置文件
    ├── package.json            项目依赖配置
    ├── cloudbaserc.json        云开发配置
    ├── vite.config.js          构建配置
    ├── tailwind.config.js      样式配置
    ├── tsconfig.json           TypeScript配置
    └── deploy.sh               部署脚本
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- 云开发环境(已配置为 cloud1-7g7oatv381500c81)

### 1. 克隆项目
```bash
git clone https://github.com/syh52/lexicon-webapp.git
cd lexicon-webapp
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
```bash
# 配置云开发环境ID (在cloudbaserc.json中)
# 配置AI API密钥 (在云函数环境变量中)
./configure-ai-api.sh
```

### 4. 本地开发
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 5. 部署到云开发
```bash
# 快速部署 (推荐)
./deploy.sh

# 或手动部署
npm run build
npx @cloudbase/cli hosting deploy dist -e cloud1-7g7oatv381500c81
```

## 📚 使用指南

### 智能背单词功能
1. **选择词书** - 在词书页面选择学习材料
2. **SM2算法** - 基于SuperMemo 2科学记忆算法
3. **设置目标** - 配置每日学习和复习数量
4. **开始学习** - 3D翻转卡片展示单词
5. **三档评分** - SM2算法的三档评分系统(知道/提示/不知道)
6. **智能调度** - 算法自动安排最佳复习时间

### AI语音助手功能
1. **进入语音助手** - 点击语音助手页面
2. **选择模式** - 对话练习/发音训练/词汇学习
3. **开始对话** - 点击录音按钮开始语音交互
4. **实时反馈** - 获得即时的语音识别和AI回复

### 词书管理功能
1. **上传词书** - 支持CSV/JSON格式词书文件
2. **管理词书** - 查看、编辑、删除词书
3. **学习统计** - 查看词书学习进度和统计

## 🎯 核心特性详解

### SM2间隔重复算法
#### SuperMemo 2算法特性
- **科学依据** - 基于SuperMemo 2的成熟记忆算法
- **三档评分** - 知道/提示/不知道简化评分体系
- **易记因子(EF)** - 动态调整单词难度系数，范围1.3-2.5
- **间隔调度** - 基于EF和复习次数计算最优复习间隔
- **当日重复** - 不熟悉的单词当天多次复习加强记忆
- **状态管理** - New → Learning → Review → Mastered 四阶段学习流程

#### 评分质量映射
- **知道(Know)** - 质量评分5，记忆清晰无困难
- **提示(Hint)** - 质量评分3，需要提示但能想起
- **不知道(Unknown)** - 质量评分1，完全不记得

### AI语音技术集成
- **OpenAI Whisper** - 业界领先的语音识别技术
- **GPT-4o-mini** - 智能对话和内容生成
- **OpenAI TTS** - 自然流畅的语音合成
- **Realtime API** - 毫秒级实时语音交互

### 现代化UI设计
- **Glass Morphism** - 毛玻璃美学设计风格
- **响应式布局** - 完美适配各种设备尺寸
- **流畅动画** - 基于Framer Motion的自然过渡
- **深色主题** - 护眼的深色配色方案

## 🔧 开发指南

### 添加新功能
1. 在`src/components/`中创建可复用组件
2. 在`src/pages/`中创建页面组件
3. 在`src/services/`中添加业务逻辑
4. 更新路由配置和导航

### 部署云函数
```bash
# 部署单个云函数
npx @cloudbase/cli functions deploy [function-name] --env cloud1-7g7oatv381500c81

# 批量部署所有云函数
npx @cloudbase/cli functions deploy --env cloud1-7g7oatv381500c81
```

### 数据库集合管理
```bash
# 创建新集合
npx @cloudbase/cli db createCollection [collection-name] --env cloud1-7g7oatv381500c81

# 导入数据
npx @cloudbase/cli db import [file-path] --env cloud1-7g7oatv381500c81
```

### 调试和测试
```bash
# 启动本地开发
npm run dev

# 构建测试
npm run build

# 运行测试
npm run test
```

## 🚀 部署流程

### 完整部署步骤
1. **构建前端**: 生成生产优化的静态文件
2. **部署静态托管**: 上传到云开发静态网站托管
3. **部署云函数**: 批量部署所有云函数
4. **配置域名**: 在云开发控制台配置自定义域名

### 环境配置
- **开发环境**: 本地开发服务器
- **预生产环境**: 云开发测试环境
- **生产环境**: `cloud1-7g7oatv381500c81`

### 监控与维护
- 云函数日志监控
- 数据库性能监控
- 静态资源CDN缓存管理
- 用户行为分析

## 📊 性能优化

### 前端优化
- **代码分割** - 按需加载减少首屏时间
- **图片优化** - WebP格式和懒加载
- **CSS优化** - PurgeCSS去除未使用样式
- **缓存策略** - 静态资源长期缓存

### 后端优化
- **云函数冷启动优化** - 预热和连接池
- **数据库查询优化** - 合理使用索引
- **CDN加速** - 静态资源全球加速
- **API响应优化** - 数据压缩和缓存

## 🔒 安全特性

### 数据安全
- 用户密码SHA256+盐值加密
- 云数据库安全规则配置
- API接口访问控制
- 管理员权限分离

### 隐私保护
- 最小化数据收集
- 用户数据加密存储
- 符合数据保护法规
- 透明的隐私政策

## 🤝 贡献指南

我们欢迎任何形式的贡献，包括但不限于：
- 🐛 Bug修复
- ✨ 新功能开发
- 📝 文档改进
- 🎨 UI/UX优化

### 贡献流程
1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📞 技术支持

### 问题反馈
如遇到技术问题，请提供以下信息：
- 操作系统和浏览器版本
- 错误截图或日志
- 复现步骤描述
- 预期行为说明

### 联系方式
- **项目仓库**: [GitHub Issues](https://github.com/syh52/lexicon-webapp/issues)
- **技术文档**: [项目Wiki](https://github.com/syh52/lexicon-webapp/wiki)
- **更新日志**: [GitHub Releases](https://github.com/syh52/lexicon-webapp/releases)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目和服务：
- [React](https://reactjs.org/) - 前端框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [腾讯云开发](https://tcb.cloud.tencent.com/) - 云服务平台
- [OpenAI](https://openai.com/) - AI服务支持
- [SM2算法](https://supermemo.guru/wiki/Algorithm_SM-2) - SuperMemo间隔重复算法

---

**Lexicon** - 让英语学习更智能、更高效 🚀