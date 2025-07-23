/**
 * 学习助手专用工具集
 */
import { tool } from '@openai/agents';
import { z } from 'zod';
import { app } from '../../utils/cloudbase';

/**
 * 查询单词定义和例句
 */
export const lookupWordDefinition = tool({
  name: 'lookupWordDefinition',
  description: '查询英语单词的详细定义、发音、例句和同义词',
  parameters: z.object({
    word: z.string().describe('要查询的英语单词'),
    includePronunciation: z.boolean().default(true).describe('是否包含发音信息'),
    includeExamples: z.boolean().default(true).describe('是否包含例句'),
  }),
  execute: async (input) => {
    try {
      // 调用词典API或数据库查询
      const response = await app.callFunction({
        name: 'dictionary-lookup',
        data: {
          word: input.word,
          includePronunciation: input.includePronunciation,
          includeExamples: input.includeExamples
        }
      });

      if (response.result?.success) {
        return {
          word: input.word,
          definition: response.result.definition,
          pronunciation: response.result.pronunciation,
          examples: response.result.examples,
          synonyms: response.result.synonyms,
          difficulty: response.result.difficulty
        };
      } else {
        return {
          word: input.word,
          definition: `${input.word} 是一个英语单词，建议查阅权威词典获取详细定义。`,
          pronunciation: `/${input.word}/`,
          examples: [`Please use "${input.word}" in a sentence.`],
          synonyms: [],
          difficulty: 'unknown'
        };
      }
    } catch (error) {
      console.error('Dictionary lookup failed:', error);
      return {
        word: input.word,
        definition: `抱歉，无法查询到 "${input.word}" 的详细信息，请稍后重试。`,
        error: error.message
      };
    }
  }
});

/**
 * 获取专业教师的深度指导
 */
export const getNextResponseFromTeacher = tool({
  name: 'getNextResponseFromTeacher',
  description: '当需要复杂的教学指导、语法解释或学习计划时，调用专业教师AI',
  parameters: z.object({
    userMessage: z.string().describe('用户的原始消息'),
    conversationHistory: z.string().describe('对话历史摘要'),
    learningContext: z.object({
      currentLevel: z.string().describe('用户当前英语水平'),
      focusArea: z.string().describe('当前学习重点领域'),
      difficulty: z.string().optional().describe('用户遇到的困难')
    }),
    relevantContextFromLastUserMessage: z.string().describe('从用户最新消息中提取的关键学习需求')
  }),
  execute: async (input) => {
    try {
      console.log('Calling teacher supervisor for advanced guidance...');

      const teacherResponse = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: [
            {
              role: 'system',
              content: `你是一位专业的英语教师，专门帮助中国学生学习英语。你具有以下特长：

1. 深度语法解释和语言规则分析
2. 个性化学习计划制定
3. 发音和语调指导
4. 文化背景和语言应用场景解释
5. 学习方法和记忆技巧指导

当前学生信息：
- 英语水平：${input.learningContext.currentLevel}
- 学习重点：${input.learningContext.focusArea}
- 遇到困难：${input.learningContext.difficulty || '未知'}

请基于学生的具体需求，提供专业、详细但易懂的指导。回复应该：
- 简洁明了（语音对话控制在100词以内）
- 提供具体可行的建议
- 包含鼓励性反馈
- 适合语音交流的自然语调

对话历史：${input.conversationHistory}`
            },
            {
              role: 'user',
              content: `学生说：${input.userMessage}

关键学习需求：${input.relevantContextFromLastUserMessage}

请提供专业的教学指导。`
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        }
      });

      if (teacherResponse.result?.choices?.[0]?.message?.content) {
        return {
          nextResponse: teacherResponse.result.choices[0].message.content,
          teachingAdvice: true,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          nextResponse: "作为你的英语老师，我建议我们继续练习。请告诉我你想学习什么特定的内容？",
          teachingAdvice: true,
          fallback: true
        };
      }
    } catch (error) {
      console.error('Teacher supervisor call failed:', error);
      return {
        nextResponse: "让我换个方式来帮助你学习。请告诉我你现在想练习什么？",
        error: true
      };
    }
  }
});

/**
 * 生成记忆技巧
 */
export const generateMemoryTechnique = tool({
  name: 'generateMemoryTechnique',
  description: '为特定单词或短语生成记忆技巧和联想方法',
  parameters: z.object({
    word: z.string().describe('需要记忆技巧的单词'),
    definition: z.string().describe('单词的定义'),
    userLevel: z.string().describe('用户的英语水平')
  }),
  execute: async (input) => {
    try {
      const response = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: [
            {
              role: 'system',
              content: '你是记忆技巧专家，擅长为英语学习者创造有效的单词记忆方法。请提供词根记忆、联想记忆、语音记忆等多种技巧。'
            },
            {
              role: 'user',
              content: `请为单词 "${input.word}"（意思：${input.definition}）创建记忆技巧。用户水平：${input.userLevel}`
            }
          ],
          temperature: 0.8,
          max_tokens: 150
        }
      });

      return {
        word: input.word,
        memoryTechniques: response.result?.choices?.[0]?.message?.content || '建议通过重复练习和实际应用来记忆这个单词。',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        word: input.word,
        memoryTechniques: '建议将这个单词与熟悉的概念联系起来，多次使用加深印象。',
        error: error.message
      };
    }
  }
});

/**
 * 安排复习计划
 */
export const scheduleReview = tool({
  name: 'scheduleReview',
  description: '基于FSRS算法为学习内容安排最优复习时间',
  parameters: z.object({
    itemId: z.string().describe('学习项目ID'),
    itemType: z.string().describe('学习项目类型：word, phrase, grammar'),
    difficulty: z.number().min(1).max(5).describe('难度评级1-5'),
    lastReview: z.string().optional().describe('上次复习时间'),
    performance: z.number().min(0).max(4).describe('学习表现评分0-4')
  }),
  execute: async (input) => {
    try {
      // 简化的FSRS算法实现
      const now = new Date();
      const difficultyMultiplier = input.difficulty / 5;
      const performanceBonus = (input.performance / 4) * 0.5;
      
      // 基础间隔（小时）
      let intervalHours = 1;
      if (input.lastReview) {
        const lastDate = new Date(input.lastReview);
        const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
        intervalHours = Math.max(1, daysSince * (2 - difficultyMultiplier + performanceBonus));
      }

      const nextReview = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

      // 保存到数据库
      try {
        await app.callFunction({
          name: 'learning-tracker',
          data: {
            action: 'schedule_review',
            itemId: input.itemId,
            itemType: input.itemType,
            nextReview: nextReview.toISOString(),
            difficulty: input.difficulty,
            performance: input.performance
          }
        });
      } catch (dbError) {
        console.warn('Failed to save review schedule:', dbError);
      }

      return {
        itemId: input.itemId,
        nextReviewTime: nextReview.toISOString(),
        intervalHours: Math.round(intervalHours * 10) / 10,
        message: `已安排 ${Math.round(intervalHours)} 小时后复习这个内容。`
      };
    } catch (error) {
      return {
        itemId: input.itemId,
        error: error.message,
        message: '复习安排失败，建议1天后手动复习。'
      };
    }
  }
});

export default {
  lookupWordDefinition,
  getNextResponseFromTeacher,
  generateMemoryTechnique,
  scheduleReview
};