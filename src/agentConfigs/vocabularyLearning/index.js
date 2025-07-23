/**
 * 词汇学习Agent配置
 * 实现Chat-Supervisor模式：基础对话Agent + 专业教师Supervisor
 */
import { RealtimeAgent } from '@openai/agents';
import { 
  lookupWordDefinition, 
  getNextResponseFromTeacher, 
  generateMemoryTechnique,
  scheduleReview
} from '../tools/learningTools.js';

/**
 * 基础词汇学习对话Agent
 * 使用realtime模型处理日常词汇练习和简单互动
 */
export const vocabularyLearningAgent = new RealtimeAgent({
  name: 'vocabularyLearning',
  voice: 'nova',
  instructions: `你是一个友好的词汇学习助手，专门帮助中国学生学习英语单词。

你的主要职责：
1. 帮助学习新单词的发音、含义和用法
2. 进行简单的词汇练习和对话
3. 提供基础的学习鼓励和反馈
4. 当遇到复杂问题时，寻求专业教师的帮助

交流风格：
- 保持友好、耐心和鼓励的语调
- 使用简单清晰的语言（适合中国学习者）
- 回复控制在50词以内（适合语音对话）
- 经常询问学习者的理解情况
- 提供积极的学习反馈

当遇到以下情况时，请调用专业教师：
- 复杂的语法解释需求
- 深度的词汇辨析问题  
- 学习方法和策略指导
- 个性化学习计划制定
- 发音技巧的详细指导

请用英语进行对话，帮助用户提高词汇量和语言表达能力。`,

  tools: [
    lookupWordDefinition,
    getNextResponseFromTeacher,
    generateMemoryTechnique,
    scheduleReview
  ],

  // 可以转交给其他专业Agent
  handoffs: [],

  // 会话配置
  sessionConfig: {
    modalities: ['text', 'audio'],
    voice: 'nova',
    inputAudioFormat: 'pcm16',
    outputAudioFormat: 'pcm16',
    inputAudioTranscription: {
      model: 'whisper-1'
    },
    turnDetection: {
      type: 'server_vad',
      threshold: 0.5,
      prefixPaddingMs: 300,
      silenceDurationMs: 500
    },
    temperature: 0.7,
    maxResponseOutputTokens: 150
  }
});

/**
 * 发音练习Agent
 */
export const pronunciationAgent = new RealtimeAgent({
  name: 'pronunciationPractice',
  voice: 'alloy',
  instructions: `你是发音练习专家，专门帮助中国学生改善英语发音。

重点任务：
1. 监听用户的发音并提供反馈
2. 教授正确的音标和发音技巧
3. 纠正常见的中式英语发音错误
4. 进行发音练习游戏和活动

发音指导原则：
- 重点关注中国学习者的发音难点（如th音、r音、l音）
- 提供具体的舌位和发音方法指导
- 使用对比练习帮助区分相似音素
- 给出鼓励性的反馈，建立学习信心

请用清晰、标准的美式英语发音作为示范。`,

  tools: [
    getNextResponseFromTeacher,
    lookupWordDefinition
  ],

  sessionConfig: {
    modalities: ['text', 'audio'],
    voice: 'alloy',
    inputAudioFormat: 'pcm16',
    outputAudioFormat: 'pcm16',
    temperature: 0.6,
    maxResponseOutputTokens: 120
  }
});

/**
 * 对话练习Agent  
 */
export const conversationAgent = new RealtimeAgent({
  name: 'conversationPractice',
  voice: 'shimmer',
  instructions: `你是对话练习伙伴，帮助学生进行真实场景的英语对话练习。

对话场景包括：
1. 日常生活对话（购物、餐厅、交通）
2. 校园对话（课堂、图书馆、社团）
3. 工作场景对话（面试、会议、同事交流）
4. 社交对话（聚会、旅行、兴趣爱好）

对话指导：
- 根据学生水平调整对话复杂度
- 主动引导对话话题和方向
- 在对话中自然纠正语法和用词
- 教授地道的英语表达和习语
- 创造真实的对话压力和节奏

保持对话的趣味性和挑战性，让学生在实践中提高口语能力。`,

  tools: [
    getNextResponseFromTeacher
  ],

  sessionConfig: {
    modalities: ['text', 'audio'],
    voice: 'shimmer',
    inputAudioFormat: 'pcm16',
    outputAudioFormat: 'pcm16',
    temperature: 0.8,
    maxResponseOutputTokens: 180
  }
});

// 默认导出词汇学习场景配置
export const vocabularyLearningScenario = [
  vocabularyLearningAgent,
  pronunciationAgent,
  conversationAgent
];

export default vocabularyLearningScenario;