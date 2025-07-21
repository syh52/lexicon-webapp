# 数据库设计文档

## 1. 单词卡片集合 (cards)

存储词汇学习卡片的基本信息和FSRS参数。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  wordbookId: String,          // 词书ID
  
  // 单词基本信息
  word: String,                // 单词
  pronunciation: String,       // 发音
  meanings: [                  // 释义数组
    {
      partOfSpeech: String,    // 词性 (n., v., adj., etc.)
      definition: String,      // 释义
      example: String          // 例句
    }
  ],
  
  // FSRS核心参数
  fsrs: {
    difficulty: Number,        // 难度值 (1-10)
    stability: Number,         // 稳定性
    retrievability: Number,    // 可回忆性
    status: String,            // 状态: 'new', 'learning', 'review', 'relearning'
    due: Date,                 // 下次复习时间
    lapses: Number,            // 遗忘次数
    reps: Number,              // 复习次数
    elapsedDays: Number,       // 间隔天数
    scheduledDays: Number,     // 预定间隔天数
    seed: Number               // 模糊化种子
  },
  
  // 元数据
  createdAt: Date,
  updatedAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, wordbookId: 1 },
    { userId: 1, "fsrs.due": 1 },
    { userId: 1, "fsrs.status": 1 }
  ]
}
```

## 2. 学习记录集合 (reviews)

存储每次学习的详细记录，用于FSRS参数优化。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  cardId: String,              // 卡片ID
  wordbookId: String,          // 词书ID
  
  // 复习信息
  rating: Number,              // 评分 (1=Again, 2=Hard, 3=Good, 4=Easy)
  reviewTime: Date,            // 复习时间
  timeSpent: Number,           // 学习用时(毫秒)
  
  // 复习前的FSRS状态
  beforeState: {
    difficulty: Number,
    stability: Number,
    retrievability: Number,
    status: String,
    elapsedDays: Number
  },
  
  // 复习后的FSRS状态
  afterState: {
    difficulty: Number,
    stability: Number,
    retrievability: Number,
    status: String,
    scheduledDays: Number,
    due: Date
  },
  
  // 元数据
  createdAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, cardId: 1, reviewTime: -1 },
    { userId: 1, wordbookId: 1, reviewTime: -1 },
    { userId: 1, reviewTime: -1 }
  ]
}
```

## 3. 用户FSRS参数集合 (user_fsrs_params)

存储用户个性化的FSRS参数。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  wordbookId: String,          // 词书ID (可选，为空表示全局参数)
  
  // FSRS参数数组 (21个参数)
  w: [Number],                 // FSRS权重参数
  
  // 用户设置
  requestRetention: Number,    // 期望保持率 (0.7-0.99)
  maximumInterval: Number,     // 最大间隔天数
  
  // 参数优化信息
  optimized: Boolean,          // 是否已优化
  optimizedAt: Date,           // 最后优化时间
  reviewCount: Number,         // 优化时使用的复习次数
  
  // 评估指标
  metrics: {
    logLoss: Number,           // 对数损失
    rmse: Number,              // 均方根误差
    accuracy: Number           // 准确率
  },
  
  // 元数据
  createdAt: Date,
  updatedAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, wordbookId: 1 },
    { userId: 1 }
  ]
}
```

## 4. 学习会话集合 (study_sessions)

存储学习会话信息，用于统计和分析。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  wordbookId: String,          // 词书ID
  
  // 会话信息
  startTime: Date,             // 开始时间
  endTime: Date,               // 结束时间
  duration: Number,            // 持续时间(毫秒)
  
  // 学习统计
  stats: {
    totalCards: Number,        // 总学习卡片数
    newCards: Number,          // 新卡片数
    reviewCards: Number,       // 复习卡片数
    againCount: Number,        // Again次数
    hardCount: Number,         // Hard次数
    goodCount: Number,         // Good次数
    easyCount: Number,         // Easy次数
    accuracy: Number           // 准确率
  },
  
  // 元数据
  createdAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, startTime: -1 },
    { userId: 1, wordbookId: 1, startTime: -1 }
  ]
}
```

## 5. 数据库权限设置

```javascript
// cards 集合权限
{
  "read": true,
  "write": "doc.userId == auth.uid"
}

// reviews 集合权限
{
  "read": "doc.userId == auth.uid",
  "write": "doc.userId == auth.uid"
}

// user_fsrs_params 集合权限
{
  "read": "doc.userId == auth.uid",
  "write": "doc.userId == auth.uid"
}

// study_sessions 集合权限
{
  "read": "doc.userId == auth.uid",
  "write": "doc.userId == auth.uid"
}
```

## 6. 用户设置集合 (user_settings)

存储用户的个人学习偏好设置。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  
  // 每日学习目标设置
  dailyNewWords: Number,       // 每日新单词数量 (默认: 16)
  dailyReviewWords: Number,    // 每日复习单词数量 (默认: 48)
  dailyTarget: Number,         // 每日总目标 (默认: 64)
  
  // 学习偏好设置
  studyMode: String,           // 学习模式: 'standard', 'intensive', 'relaxed'
  enableVoice: Boolean,        // 是否启用语音播放 (默认: true)
  autoNext: Boolean,           // 是否自动进入下一个单词 (默认: false)
  
  // 提醒设置
  enableReminder: Boolean,     // 是否启用学习提醒 (默认: true)
  reminderTime: String,        // 提醒时间 (格式: "HH:MM")
  
  // 元数据
  createdAt: Date,
  updatedAt: Date,
  
  // 索引
  indexes: [
    { userId: 1 }
  ]
}
```

## 7. 每日学习计划集合 (daily_study_plans)

存储每日的学习计划和进度信息。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  wordbookId: String,          // 词书ID
  
  // 日期信息
  date: String,                // 日期 (格式: "YYYY-MM-DD")
  
  // 学习计划
  plannedWords: [String],      // 计划学习的单词ID列表
  totalCount: Number,          // 总计划单词数
  newWordsCount: Number,       // 新单词数量
  reviewWordsCount: Number,    // 复习单词数量
  
  // 学习进度
  completedWords: [String],    // 已完成的单词ID列表
  currentIndex: Number,        // 当前学习进度索引
  completedCount: Number,      // 已完成数量
  
  // 学习统计
  stats: {
    knownCount: Number,        // 认识的单词数
    unknownCount: Number,      // 不认识的单词数
    studyTime: Number,         // 总学习时间(秒)
    accuracy: Number           // 准确率
  },
  
  // 状态信息
  isCompleted: Boolean,        // 是否完成今日目标
  completedAt: Date,           // 完成时间
  
  // 元数据
  createdAt: Date,
  updatedAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, date: -1 },
    { userId: 1, wordbookId: 1, date: -1 },
    { userId: 1, date: -1, isCompleted: 1 }
  ]
}
```

## 8. 学习会话集合 (study_sessions)

存储学习会话的详细信息（扩展现有结构）。

```javascript
{
  _id: ObjectId,
  userId: String,              // 用户ID
  wordbookId: String,          // 词书ID
  planId: String,              // 关联的每日计划ID
  
  // 会话信息
  startTime: Date,             // 开始时间
  endTime: Date,               // 结束时间
  duration: Number,            // 持续时间(毫秒)
  
  // 学习统计
  stats: {
    totalCards: Number,        // 总学习卡片数
    newCards: Number,          // 新卡片数
    reviewCards: Number,       // 复习卡片数
    againCount: Number,        // Again次数
    hardCount: Number,         // Hard次数
    goodCount: Number,         // Good次数
    easyCount: Number,         // Easy次数
    accuracy: Number           // 准确率
  },
  
  // 会话状态
  status: String,              // 会话状态: 'active', 'paused', 'completed', 'interrupted'
  resumeData: {                // 用于恢复会话的数据
    currentIndex: Number,
    remainingWords: [String],
    completedWords: [String]
  },
  
  // 元数据
  createdAt: Date,
  updatedAt: Date,
  
  // 索引
  indexes: [
    { userId: 1, startTime: -1 },
    { userId: 1, wordbookId: 1, startTime: -1 },
    { userId: 1, planId: 1, startTime: -1 }
  ]
}
```

## 9. 初始数据说明

- 新用户会使用默认的FSRS参数
- 新卡片的初始状态为'new'，difficulty和stability使用默认值
- 需要导入基础单词数据到cards集合
- 需要为每个词书创建默认的FSRS参数配置
- 新用户会创建默认的学习设置（dailyNewWords: 16, dailyReviewWords: 48）
- 每日学习计划会在用户首次访问时自动生成