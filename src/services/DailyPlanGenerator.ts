import { UserSettings } from './userSettingsService';
import { SimpleWordRecord, WORD_STATUS } from '../utils/simpleReviewAlgorithm';

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
  
  // 学习统计
  stats: {
    knownCount: number;
    unknownCount: number;
    studyTime: number;
    accuracy: number;
  };
  
  // 状态信息
  isCompleted: boolean;
  completedAt?: Date;
  
  // 元数据
  createdAt?: Date;
  updatedAt?: Date;
}

// 单词优先级评分接口
interface WordPriority {
  wordId: string;
  word: string;
  priority: number;
  type: 'new' | 'review' | 'overdue';
  dueDate?: Date;
  lastReview?: Date;
  failureCount?: number;
}

export class DailyPlanGenerator {
  /**
   * 生成每日学习计划
   */
  static generateDailyPlan(
    userId: string,
    wordbookId: string,
    userSettings: UserSettings,
    allWords: any[],
    userStudyRecords: any[],
    date: string = new Date().toISOString().split('T')[0]
  ): DailyStudyPlan {
    // 1. 转换为SimpleWordRecord格式
    const wordRecords = this.convertToWordRecords(allWords, userStudyRecords);
    
    // 2. 分类和优先级排序
    const { newWords, reviewWords, overdueWords } = this.categorizeWords(wordRecords);
    
    // 3. 计算优先级评分
    const prioritizedWords = this.calculatePriorities(newWords, reviewWords, overdueWords);
    
    // 4. 根据用户设置选择单词
    const selectedWords = this.selectWordsForPlan(prioritizedWords, userSettings);
    
    // 5. 生成最终计划
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
        studyTime: 0,
        accuracy: 0
      },
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return plan;
  }

  /**
   * 转换为SimpleWordRecord格式
   */
  private static convertToWordRecords(allWords: any[], userStudyRecords: any[]): SimpleWordRecord[] {
    const userRecordMap = new Map();
    
    // 构建用户学习记录映射
    userStudyRecords.forEach(record => {
      userRecordMap.set(record.wordId, record);
    });
    
    // 转换所有单词
    return allWords.map(word => {
      const userRecord = userRecordMap.get(word._id);
      
      if (userRecord) {
        // 已有学习记录，恢复状态
        const wordRecord = new SimpleWordRecord(word._id, word.word);
        wordRecord.stage = userRecord.stage || 0;
        wordRecord.nextReview = new Date(userRecord.nextReview || Date.now());
        wordRecord.failures = userRecord.failures || 0;
        wordRecord.successes = userRecord.successes || 0;
        wordRecord.lastReview = userRecord.lastReview ? new Date(userRecord.lastReview) : null;
        wordRecord.status = userRecord.status || WORD_STATUS.new;
        wordRecord.createdAt = userRecord.createdAt ? new Date(userRecord.createdAt) : new Date();
        wordRecord.updateStatus();
        return wordRecord;
      } else {
        // 新单词
        return new SimpleWordRecord(word._id, word.word);
      }
    });
  }

  /**
   * 分类单词
   */
  private static categorizeWords(wordRecords: SimpleWordRecord[]): {
    newWords: SimpleWordRecord[];
    reviewWords: SimpleWordRecord[];
    overdueWords: SimpleWordRecord[];
  } {
    const now = new Date();
    const newWords: SimpleWordRecord[] = [];
    const reviewWords: SimpleWordRecord[] = [];
    const overdueWords: SimpleWordRecord[] = [];
    
    wordRecords.forEach(record => {
      if (record.status === WORD_STATUS.new) {
        newWords.push(record);
      } else if (record.status === WORD_STATUS.mastered) {
        // 已掌握的单词暂时不加入学习计划
        return;
      } else if (record.isDueForReview()) {
        // 计算过期时间
        const overdueDays = Math.floor((now.getTime() - record.nextReview.getTime()) / (24 * 60 * 60 * 1000));
        if (overdueDays > 1) {
          overdueWords.push(record);
        } else {
          reviewWords.push(record);
        }
      }
    });
    
    return { newWords, reviewWords, overdueWords };
  }

  /**
   * 计算单词优先级
   */
  private static calculatePriorities(
    newWords: SimpleWordRecord[],
    reviewWords: SimpleWordRecord[],
    overdueWords: SimpleWordRecord[]
  ): WordPriority[] {
    const now = new Date();
    const priorities: WordPriority[] = [];
    
    // 过期单词 - 最高优先级
    overdueWords.forEach(word => {
      const overdueDays = Math.floor((now.getTime() - word.nextReview.getTime()) / (24 * 60 * 60 * 1000));
      const failurePenalty = word.failures * 0.2;
      const priority = 1000 + overdueDays * 10 + failurePenalty;
      
      priorities.push({
        wordId: word.wordId,
        word: word.word,
        priority,
        type: 'overdue',
        dueDate: word.nextReview,
        lastReview: word.lastReview,
        failureCount: word.failures
      });
    });
    
    // 复习单词 - 中等优先级
    reviewWords.forEach(word => {
      const daysSinceLastReview = word.lastReview ? 
        Math.floor((now.getTime() - word.lastReview.getTime()) / (24 * 60 * 60 * 1000)) : 0;
      const failurePenalty = word.failures * 0.1;
      const priority = 500 + daysSinceLastReview * 5 + failurePenalty;
      
      priorities.push({
        wordId: word.wordId,
        word: word.word,
        priority,
        type: 'review',
        dueDate: word.nextReview,
        lastReview: word.lastReview,
        failureCount: word.failures
      });
    });
    
    // 新单词 - 基础优先级
    newWords.forEach(word => {
      const priority = 100 + Math.random() * 50; // 随机化避免总是相同顺序
      
      priorities.push({
        wordId: word.wordId,
        word: word.word,
        priority,
        type: 'new'
      });
    });
    
    // 按优先级排序
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 根据用户设置选择单词
   */
  private static selectWordsForPlan(
    prioritizedWords: WordPriority[],
    userSettings: UserSettings
  ): WordPriority[] {
    const selectedWords: WordPriority[] = [];
    
    // 1. 优先选择过期和复习单词
    const overdueAndReviewWords = prioritizedWords.filter(w => w.type === 'overdue' || w.type === 'review');
    const selectedReviewWords = overdueAndReviewWords.slice(0, userSettings.dailyReviewWords);
    selectedWords.push(...selectedReviewWords);
    
    // 2. 如果复习单词不足，用新单词补充
    const remainingSlots = userSettings.dailyTarget - selectedWords.length;
    if (remainingSlots > 0) {
      const newWords = prioritizedWords.filter(w => w.type === 'new');
      const newWordsToAdd = Math.min(remainingSlots, userSettings.dailyNewWords);
      selectedWords.push(...newWords.slice(0, newWordsToAdd));
    }
    
    // 3. 如果仍有空位，继续添加新单词
    const stillRemaining = userSettings.dailyTarget - selectedWords.length;
    if (stillRemaining > 0) {
      const newWords = prioritizedWords.filter(w => w.type === 'new');
      const alreadySelectedNewWords = selectedWords.filter(w => w.type === 'new').length;
      const additionalNewWords = newWords.slice(alreadySelectedNewWords, alreadySelectedNewWords + stillRemaining);
      selectedWords.push(...additionalNewWords);
    }
    
    return selectedWords;
  }

  /**
   * 更新学习计划进度
   */
  static updatePlanProgress(
    plan: DailyStudyPlan,
    completedWordId: string,
    isKnown: boolean,
    studyTime: number = 0
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
    }
    
    updatedPlan.stats.studyTime += studyTime;
    
    // 计算准确率
    const totalAnswered = updatedPlan.stats.knownCount + updatedPlan.stats.unknownCount;
    if (totalAnswered > 0) {
      updatedPlan.stats.accuracy = (updatedPlan.stats.knownCount / totalAnswered) * 100;
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