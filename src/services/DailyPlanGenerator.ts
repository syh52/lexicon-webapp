import { UserSettings } from './userSettingsService';
import { SM2Card, SM2CardStatus, StudyChoice } from '../types';
import { SM2Service } from './sm2Service';
import { isSM2CardDue, getSM2MasteryLevel } from '../utils/sm2Algorithm';

// 每日学习计划接口
export interface DailyStudyPlan {
  _id?: string;
  userId: string;
  wordbookId: string;
  date: string;
  
  // 学习计划
  plannedWords: string[];
  totalCount: number;
  newWordsCount: number;
  reviewWordsCount: number;
  
  // 学习进度
  completedWords: string[];
  currentIndex: number;
  completedCount: number;
  
  // 学习统计 - 扩展支持SM-2
  stats: {
    knownCount: number;
    unknownCount: number;
    hintCount?: number; // SM-2新增：提示次数
    studyTime: number;
    accuracy: number;
    // SM-2专用统计
    choiceStats?: {
      knowCount: number;
      hintCount: number;
      unknownCount: number;
    };
    repeatCount?: number; // 当日重复次数
  };
  
  // 状态信息
  isCompleted: boolean;
  completedAt?: Date;
  
  // 元数据
  createdAt?: Date;
  updatedAt?: Date;
}

// 单词优先级评分接口 - 扩展支持SM-2
interface WordPriority {
  wordId: string;
  word: string;
  priority: number;
  type: 'new' | 'review' | 'overdue';
  dueDate?: Date;
  lastReview?: Date;
  failureCount?: number;
  // SM-2扩展字段
  sm2Card?: SM2Card;
  masteryLevel?: number; // 掌握程度
  EF?: number; // 易记因子
}

export class DailyPlanGenerator {
  private static sm2Service = new SM2Service();

  /**
   * 生成每日学习计划 - 使用SM2算法
   */
  static async generateDailyPlan(
    userId: string,
    wordbookId: string,
    userSettings: UserSettings,
    allWords: any[],
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<DailyStudyPlan> {
    // 直接使用SM2算法生成计划
    return this.generateSM2DailyPlan(userId, wordbookId, userSettings, allWords, date);
  }

  /**
   * 使用SM-2算法生成每日学习计划 - 新方法
   */
  static async generateSM2DailyPlan(
    userId: string,
    wordbookId: string,
    userSettings: UserSettings,
    allWords: any[],
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<DailyStudyPlan> {
    try {
      // 1. 获取用户的SM-2卡片
      const sm2Cards = await this.sm2Service.getUserSM2Records(userId, wordbookId);
      
      // 2. 创建单词映射
      const wordMap = new Map(allWords.map(word => [word._id, word]));
      
      // 3. 为新单词创建SM-2卡片
      const existingCardIds = new Set(sm2Cards.map(card => card.wordId));
      const newWordIds = allWords
        .map(word => word._id)
        .filter(wordId => !existingCardIds.has(wordId));
      
      // 4. 分类SM-2卡片
      const prioritizedWords = this.categorizeSM2Cards(sm2Cards, newWordIds, wordMap);
      
      // 5. 根据用户设置选择单词
      const selectedWords = this.selectWordsForSM2Plan(prioritizedWords, userSettings);
      
      // 6. 生成最终计划
      const plan: DailyStudyPlan = {
        userId,
        wordbookId,
        date,
        plannedWords: selectedWords.map(w => w.wordId),
        totalCount: selectedWords.length,
        newWordsCount: selectedWords.filter(w => w.type === 'new').length,
        reviewWordsCount: selectedWords.filter(w => w.type === 'review' || w.type === 'overdue').length,
        completedWords: [],
        currentIndex: 0,
        completedCount: 0,
        stats: {
          knownCount: 0,
          unknownCount: 0,
          hintCount: 0,
          studyTime: 0,
          accuracy: 0,
          choiceStats: {
            knowCount: 0,
            hintCount: 0,
            unknownCount: 0
          },
          repeatCount: 0
        },
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return plan;
    } catch (error) {
      console.error('生成SM-2每日计划失败:', error);
      // 返回空计划作为降级处理
      return {
        userId,
        wordbookId,
        date,
        plannedWords: [],
        totalCount: 0,
        newWordsCount: 0,
        reviewWordsCount: 0,
        completedWords: [],
        currentIndex: 0,
        completedCount: 0,
        stats: {
          knownCount: 0,
          unknownCount: 0,
          hintCount: 0,
          studyTime: 0,
          accuracy: 0,
          choiceStats: {
            knowCount: 0,
            hintCount: 0,
            unknownCount: 0
          },
          repeatCount: 0
        },
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }


  /**
   * 分类SM-2卡片 - 新方法
   */
  private static categorizeSM2Cards(
    sm2Cards: SM2Card[], 
    newWordIds: string[], 
    wordMap: Map<string, any>
  ): WordPriority[] {
    const now = new Date();
    const priorities: WordPriority[] = [];
    
    // 处理现有的SM-2卡片
    sm2Cards.forEach(card => {
      const word = wordMap.get(card.wordId);
      if (!word) return;
      
      const masteryLevel = getSM2MasteryLevel(card);
      let priority = 0;
      let type: 'new' | 'review' | 'overdue' = 'review';
      
      if (card.status === SM2CardStatus.Mastered && masteryLevel >= 90) {
        // 已充分掌握的单词，优先级最低
        priority = 10;
      } else if (isSM2CardDue(card, now)) {
        // 到期需要复习的卡片
        const overdueDays = Math.max(0, Math.floor((now.getTime() - card.nextReview.getTime()) / (24 * 60 * 60 * 1000)));
        
        if (overdueDays > 1) {
          // 过期单词 - 最高优先级
          type = 'overdue';
          priority = 1000 + overdueDays * 20 + (100 - masteryLevel) * 5;
        } else {
          // 正常到期单词 - 中等优先级
          type = 'review';
          priority = 500 + (100 - masteryLevel) * 3 + (3.0 - card.EF) * 50;
        }
      } else {
        // 尚未到期，优先级很低
        priority = 50 + (100 - masteryLevel) * 0.5;
      }
      
      priorities.push({
        wordId: card.wordId,
        word: word.word,
        priority,
        type,
        dueDate: card.nextReview,
        lastReview: card.lastReview,
        failureCount: Math.max(0, card.repetitions === 0 ? 1 : 0),
        sm2Card: card,
        masteryLevel,
        EF: card.EF
      });
    });
    
    // 处理新单词
    newWordIds.forEach(wordId => {
      const word = wordMap.get(wordId);
      if (!word) return;
      
      priorities.push({
        wordId,
        word: word.word,
        priority: 200 + Math.random() * 50, // 新单词基础优先级
        type: 'new',
        masteryLevel: 0,
        EF: 2.5
      });
    });
    
    // 按优先级排序
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 为SM-2计划选择单词 - 新方法
   */
  private static selectWordsForSM2Plan(
    prioritizedWords: WordPriority[],
    userSettings: UserSettings
  ): WordPriority[] {
    const selectedWords: WordPriority[] = [];
    
    // 1. 优先选择过期和急需复习的单词
    const urgentWords = prioritizedWords.filter(w => 
      w.type === 'overdue' || (w.type === 'review' && w.priority > 600)
    );
    const selectedUrgent = urgentWords.slice(0, Math.ceil(userSettings.dailyReviewWords * 0.7));
    selectedWords.push(...selectedUrgent);
    
    // 2. 添加正常复习单词
    const remainingReviewSlots = userSettings.dailyReviewWords - selectedWords.length;
    if (remainingReviewSlots > 0) {
      const normalReviewWords = prioritizedWords.filter(w => 
        w.type === 'review' && !selectedWords.includes(w)
      );
      selectedWords.push(...normalReviewWords.slice(0, remainingReviewSlots));
    }
    
    // 3. 添加新单词
    const remainingSlots = userSettings.dailyTarget - selectedWords.length;
    if (remainingSlots > 0) {
      const newWords = prioritizedWords.filter(w => w.type === 'new');
      const newWordsToAdd = Math.min(remainingSlots, userSettings.dailyNewWords);
      selectedWords.push(...newWords.slice(0, newWordsToAdd));
    }
    
    // 4. 如果还有空位，优先填充掌握度较低的单词
    const stillRemaining = userSettings.dailyTarget - selectedWords.length;
    if (stillRemaining > 0) {
      const remainingWords = prioritizedWords.filter(w => 
        !selectedWords.includes(w) && w.masteryLevel < 80
      );
      selectedWords.push(...remainingWords.slice(0, stillRemaining));
    }
    
    return selectedWords;
  }

  /**
   * 更新学习计划进度 - 支持SM-2
   */
  static updatePlanProgress(
    plan: DailyStudyPlan,
    completedWordId: string,
    isKnown: boolean,
    studyTime: number = 0,
    choice?: StudyChoice
  ): DailyStudyPlan {
    const updatedPlan = { ...plan };
    
    // 更新已完成单词列表和进度
    if (!updatedPlan.completedWords.includes(completedWordId)) {
      updatedPlan.completedWords.push(completedWordId);
      updatedPlan.completedCount = updatedPlan.completedWords.length;
      
      // 更新当前索引（只有在新完成单词时才更新）
      if (updatedPlan.currentIndex < updatedPlan.plannedWords.length - 1) {
        updatedPlan.currentIndex++;
      }
      
      // 更新统计信息（只有在新完成单词时才更新）
      if (isKnown) {
        updatedPlan.stats.knownCount++;
      } else {
        updatedPlan.stats.unknownCount++;
      }
      
      // SM-2扩展统计
      if (choice && updatedPlan.stats.choiceStats) {
        switch (choice) {
          case StudyChoice.Know:
            updatedPlan.stats.choiceStats.knowCount++;
            break;
          case StudyChoice.Hint:
            updatedPlan.stats.choiceStats.hintCount++;
            updatedPlan.stats.hintCount = (updatedPlan.stats.hintCount || 0) + 1;
            break;
          case StudyChoice.Unknown:
            updatedPlan.stats.choiceStats.unknownCount++;
            updatedPlan.stats.repeatCount = (updatedPlan.stats.repeatCount || 0) + 1;
            break;
        }
      }
    }
    
    updatedPlan.stats.studyTime += studyTime;
    
    // 计算准确率 - SM-2版本
    if (updatedPlan.stats.choiceStats) {
      const totalChoices = updatedPlan.stats.choiceStats.knowCount + 
                          updatedPlan.stats.choiceStats.hintCount + 
                          updatedPlan.stats.choiceStats.unknownCount;
      if (totalChoices > 0) {
        updatedPlan.stats.accuracy = 
          ((updatedPlan.stats.choiceStats.knowCount + updatedPlan.stats.choiceStats.hintCount * 0.7) / totalChoices) * 100;
      }
    } else {
      // 传统计算方式
      const totalAnswered = updatedPlan.stats.knownCount + updatedPlan.stats.unknownCount;
      if (totalAnswered > 0) {
        updatedPlan.stats.accuracy = (updatedPlan.stats.knownCount / totalAnswered) * 100;
      }
    }
    
    // 检查是否完成
    if (updatedPlan.completedCount >= updatedPlan.totalCount) {
      updatedPlan.isCompleted = true;
      updatedPlan.completedAt = new Date();
    }
    
    updatedPlan.updatedAt = new Date();
    
    return updatedPlan;
  }

  /**
   * 验证计划是否有效
   */
  static validatePlan(plan: DailyStudyPlan): boolean {
    if (!plan.userId || !plan.wordbookId || !plan.date) {
      return false;
    }
    
    if (plan.totalCount !== plan.plannedWords.length) {
      return false;
    }
    
    if (plan.completedCount !== plan.completedWords.length) {
      return false;
    }
    
    return true;
  }
}

export default DailyPlanGenerator;