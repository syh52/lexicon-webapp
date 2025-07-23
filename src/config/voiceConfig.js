/**
 * 语音助手配置文件
 * 管理CloudBase环境、API配置和语音参数
 */

// 检查是否为开发环境
const isDevelopment = import.meta.env.MODE === 'development';

// CloudBase环境配置
export const cloudbaseConfig = {
  // 这些值需要根据实际的云开发环境进行配置
  env: import.meta.env.VITE_CLOUDBASE_ENV || 'your-env-id', // 需要替换为实际的环境ID
  appId: import.meta.env.VITE_CLOUDBASE_APP_ID || '',
  secretId: import.meta.env.VITE_TENCENT_SECRET_ID || '',
  secretKey: import.meta.env.VITE_TENCENT_SECRET_KEY || '',
  region: import.meta.env.VITE_TENCENT_REGION || 'ap-beijing'
};

// WebSocket连接配置
export const websocketConfig = {
  // 开发环境使用本地云函数，生产环境使用部署的云函数
  baseUrl: isDevelopment 
    ? 'ws://localhost:8080' 
    : `wss://${cloudbaseConfig.env}.service.tcloudbase.com`,
  
  // 语音助手云函数的WebSocket端点
  voiceEndpoint: '/voice-assistant',
  
  // 连接选项
  options: {
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    pingInterval: 30000
  }
};

// 音频处理配置
export const audioConfig = {
  // 音频采样配置
  sampleRate: 24000,
  channels: 1,
  bufferSize: 1024,
  
  // 音频质量配置
  bitDepth: 16,
  format: 'pcm',
  
  // 语音检测配置
  silenceThreshold: 0.01,
  minRecordingDuration: 500, // 最小录音时长(ms)
  maxRecordingDuration: 30000, // 最大录音时长(ms)
  
  // VAD (Voice Activity Detection) 配置
  vadEnabled: true,
  vadSensitivity: 0.5,
  vadFrameSize: 512,
  
  // 音频处理配置
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true
};

// 语音识别配置
export const asrConfig = {
  // 语言设置
  language: 'en-US', // 英语
  alternativeLanguage: 'zh-CN', // 备选中文
  
  // 识别模式
  mode: 'realtime', // 实时识别
  
  // Tencent Cloud ASR配置
  tencent: {
    engineModelType: '16k_en', // 英语16k模型
    filterDirty: 0, // 不过滤脏话
    filterModal: 0, // 不过滤语气词
    filterPunc: 0, // 不过滤标点
    convertNumMode: 1, // 数字转换模式
    
    // 语言模型配置
    hotwordId: '', // 热词表ID
    customizationId: '', // 自定义语言模型ID
    
    // 实时识别配置
    needvad: 1, // 启用VAD
    vadSilenceTime: 1000, // VAD静音时长
    wordInfo: 2 // 返回词级别信息
  },
  
  // CloudBase ASR配置（备选）
  cloudbase: {
    engine: 'english', // 英语引擎
    model: 'conversation', // 对话模型
    enableVad: true,
    vadThreshold: 0.5
  }
};

// 语音合成配置 - 基于New API的OpenAI TTS格式
export const ttsConfig = {
  // 默认语音配置 - OpenAI TTS格式
  default: {
    model: 'tts-1', // 标准TTS模型
    voice: 'nova', // 英语女声（适合对话）
    speed: 1.0, // 语速 (0.25-4.0)
    format: 'mp3' // 音频格式
  },
  
  // 支持的TTS模型（根据New API文档）
  models: {
    'tts-1': { name: 'TTS-1 标准版', description: '快速响应，适合实时对话' },
    'tts-1-1106': { name: 'TTS-1 (1106)', description: '优化版本' },
    'tts-1-hd': { name: 'TTS-1 高清版', description: '更高音质，适合内容播放' },
    'tts-1-hd-1106': { name: 'TTS-1 HD (1106)', description: '高清优化版本' },
    'gpt-4o-mini-tts': { name: 'GPT-4o Mini TTS', description: '最新的轻量级TTS模型' }
  },
  
  // 支持的语音类型（OpenAI TTS标准）
  voices: {
    'alloy': { name: '中性音色', description: '平衡的中性语音', category: 'neutral' },
    'echo': { name: '男性音色', description: '清晰的男性语音', category: 'male' },
    'fable': { name: '英式男性', description: '带有英式口音的男性语音', category: 'male' },
    'onyx': { name: '深沉男性', description: '低沉有力的男性语音', category: 'male' },
    'nova': { name: '女性音色', description: '温和友好的女性语音', category: 'female' },
    'shimmer': { name: '柔和女性', description: '柔和优雅的女性语音', category: 'female' }
  },
  
  // 语速预设
  speedPresets: {
    'very-slow': 0.5,
    'slow': 0.7,
    'normal': 1.0,
    'fast': 1.3,
    'very-fast': 1.8
  },
  
  // 音频格式支持
  formats: {
    'mp3': { name: 'MP3', extension: '.mp3', mimeType: 'audio/mpeg' },
    'opus': { name: 'Opus', extension: '.opus', mimeType: 'audio/opus' },
    'aac': { name: 'AAC', extension: '.aac', mimeType: 'audio/aac' },
    'flac': { name: 'FLAC', extension: '.flac', mimeType: 'audio/flac' }
  },
  
  // 场景化配置
  scenarios: {
    conversation: { 
      model: 'tts-1', 
      voice: 'nova', 
      speed: 1.0,
      description: '对话场景，快速响应' 
    },
    content: { 
      model: 'tts-1-hd', 
      voice: 'alloy', 
      speed: 0.9,
      description: '内容播放，高音质' 
    },
    learning: { 
      model: 'tts-1', 
      voice: 'shimmer', 
      speed: 0.8,
      description: '学习场景，清晰易懂' 
    }
  },
  
  // 降级配置（浏览器TTS）
  fallback: {
    enabled: true,
    lang: 'en-US',
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0
  }
};

// AI对话配置
export const aiConfig = {
  // 模型配置
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 200,
  
  // 用户等级配置
  userLevels: {
    beginner: {
      name: '初级',
      description: '适合英语基础较弱的学习者',
      systemPrompt: '使用简单的词汇和短句，语速较慢',
      maxTokens: 150
    },
    intermediate: {
      name: '中级',
      description: '适合有一定英语基础的学习者',
      systemPrompt: '使用中等难度的词汇和句式',
      maxTokens: 200
    },
    advanced: {
      name: '高级',
      description: '适合英语水平较高的学习者',
      systemPrompt: '可以使用复杂的词汇和句式',
      maxTokens: 300
    }
  },
  
  // 对话场景配置
  scenarios: {
    general: {
      name: '日常对话',
      description: '一般日常话题交流'
    },
    business: {
      name: '商务英语',
      description: '商务场景对话练习'
    },
    academic: {
      name: '学术英语',
      description: '学术讨论和表达'
    },
    travel: {
      name: '旅游英语',
      description: '旅游场景对话'
    },
    daily: {
      name: '生活英语',
      description: '日常生活场景对话'
    }
  },
  
  // API配置
  apis: {
    openai: {
      baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.gpts.vin',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      model: 'gpt-4o-mini'
    },
    cloudbase: {
      botId: import.meta.env.VITE_CLOUDBASE_BOT_ID || '',
      model: 'general'
    }
  }
};

// 学习分析配置
export const learningConfig = {
  // 分析维度
  analysisTypes: {
    grammar: { name: '语法', weight: 0.3 },
    vocabulary: { name: '词汇', weight: 0.25 },
    pronunciation: { name: '发音', weight: 0.25 },
    fluency: { name: '流利度', weight: 0.2 }
  },
  
  // 评分标准
  scoringRubrics: {
    excellent: { min: 90, label: '优秀', color: '#10b981' },
    good: { min: 80, label: '良好', color: '#3b82f6' },
    fair: { min: 70, label: '一般', color: '#f59e0b' },
    poor: { min: 60, label: '较差', color: '#ef4444' },
    very_poor: { min: 0, label: '很差', color: '#7f1d1d' }
  },
  
  // 统计配置
  statistics: {
    retentionDays: 30, // 保留30天的学习记录
    sessionTimeout: 1800000, // 30分钟无活动视为会话结束
    minSessionDuration: 60000 // 最小有效会话时长1分钟
  }
};

// 错误处理配置
export const errorConfig = {
  // 错误类型
  types: {
    NETWORK_ERROR: '网络连接错误',
    AUDIO_ERROR: '音频处理错误',
    PERMISSION_ERROR: '权限不足',
    CONFIG_ERROR: '配置错误',
    API_ERROR: 'API调用错误',
    WEBSOCKET_ERROR: 'WebSocket连接错误'
  },
  
  // 重试配置
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000
  },
  
  // 用户友好的错误消息
  userMessages: {
    MICROPHONE_ACCESS_DENIED: '请允许访问麦克风以使用语音功能',
    NETWORK_CONNECTION_FAILED: '网络连接失败，请检查网络设置',
    AUDIO_PROCESSING_FAILED: '音频处理出现问题，请重试',
    SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试'
  }
};

// 开发调试配置
export const debugConfig = {
  enabled: isDevelopment,
  logLevel: isDevelopment ? 'debug' : 'error',
  
  // 调试选项
  options: {
    logAudioData: false,
    logWebSocketMessages: true,
    logAIResponses: true,
    mockAudioInput: false,
    skipAudioPlayback: false
  }
};

// 导出默认配置
export default {
  cloudbase: cloudbaseConfig,
  websocket: websocketConfig,
  audio: audioConfig,
  asr: asrConfig,
  tts: ttsConfig,
  ai: aiConfig,
  learning: learningConfig,
  error: errorConfig,
  debug: debugConfig
};