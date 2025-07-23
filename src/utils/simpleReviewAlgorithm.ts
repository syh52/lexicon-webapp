/**
 * 简洁有效的背单词复习算法
 * 基于艾宾浩斯遗忘曲线，使用"认识"/"不认识"二元评价
 */

// 艾宾浩斯遗忘曲线间隔（天）
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

// 单词状态
export const WORD_STATUS = {
  new: 'new',
  learning: 'learning',
  reviewing: 'reviewing',
  mastered: 'mastered'
} as const;

export type WordStatus = typeof WORD_STATUS[keyof typeof WORD_STATUS];

// 每日学习配比预设
export const DAILY_CONFIGS = {
  conservative: { newWords: 12, reviewWords: 52 },
  standard: { newWords: 16, reviewWords: 48 },
  aggressive: { newWords: 20, reviewWords: 44 }
} as const;

export type DailyConfigType = keyof typeof DAILY_CONFIGS;

// 用户单词记录接口
interface UserWordRecord {
  wordId: string;
  stage?: number;
  nextReview?: string | Date;
  failures?: number;
  successes?: number;
  lastReview?: string | Date | null;
  status?: WordStatus;
  createdAt?: string | Date;
}

// 单词数据接口
interface WordData {
  _id: string;
  word: string;
  [key: string]: any;
}

// 学习统计接口
export interface StudyStats {
  total: number;
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueToday: number;
  averageMastery: number;
}

// 配置接口
export interface SchedulerConfig {
  newWords: number;
  reviewWords: number;
}

/**
 * 简化的单词学习记录
 */
export class SimpleWordRecord {
  wordId: string;
  word: string;
  stage: number;
  nextReview: Date;
  failures: number;
  successes: number;
  lastReview: Date | null;
  status: WordStatus;
  createdAt: Date;

  constructor(wordId: string, word: string) {
    this.wordId = wordId;
    this.word = word;
    this.stage = 0;                    // 复习阶段 0-6
    this.nextReview = new Date();      // 下次复习时间
    this.failures = 0;                // 失败次数
    this.successes = 0;               // 成功次数
    this.lastReview = null;           // 上次复习时间
    this.status = WORD_STATUS.new;    // 单词状态
    this.createdAt = new Date();      // 创建时间
  }

  /**
   * 用户选择"认识"
   */
  markAsKnown(): void {
    this.successes++;
    this.lastReview = new Date();
    
    // 进入下一阶段
    this.stage = Math.min(this.stage + 1, REVIEW_INTERVALS.length - 1);
    
    // 计算下次复习时间
    let interval = REVIEW_INTERVALS[this.stage];
    
    // 根据失败次数调整间隔（失败多的单词间隔缩短）
    if (this.failures > 0) {
      interval = Math.max(1, Math.floor(interval * Math.pow(0.8, this.failures)));
    }
    
    this.nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    
    // 更新状态
    this.updateStatus();
  }

  /**
   * 用户选择"不认识"
   */
  markAsUnknown(): void {
    this.failures++;
    this.lastReview = new Date();
    
    // 重置到较早阶段
    this.stage = Math.max(0, this.stage - 1);
    
    // 1天后重新复习
    this.nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // 更新状态
    this.status = WORD_STATUS.learning;
  }

  /**
   * 更新单词状态
   */
  updateStatus(): void {
    if (this.stage >= 6) {
      this.status = WORD_STATUS.mastered;
    } else if (this.stage >= 3) {
      this.status = WORD_STATUS.reviewing;
    } else {
      this.status = WORD_STATUS.learning;
    }
  }

  /**
   * 检查是否需要复习
   */
  isDueForReview(): boolean {
    return new Date() >= this.nextReview;
  }

  /**
   * 获取掌握程度（0-100）
   */
  getMasteryLevel(): number {
    const baseLevel = (this.stage / (REVIEW_INTERVALS.length - 1)) * 100;
    const successRate = this.successes / Math.max(1, this.successes + this.failures);
    return Math.min(100, Math.floor(baseLevel * successRate));
  }
}

// 单词分类结果接口
interface CategorizedWords {
  newWords: SimpleWordRecord[];
  dueReviewWords: SimpleWordRecord[];
  futureReviewWords: SimpleWordRecord[];
}

/**
 * 简化的复习调度器
 */
export class SimpleReviewScheduler {
  config: SchedulerConfig;
  dailyLimit: number;

  constructor(config: SchedulerConfig = DAILY_CONFIGS.standard) {
    this.config = config;
    this.dailyLimit = config.newWords + config.reviewWords;
  }

  /**
   * 获取今日学习队列
   */
  getDailyStudyQueue(allWords: WordData[], userWords: UserWordRecord[] = []): SimpleWordRecord[] {
    const now = new Date();
    
    // 转换为SimpleWordRecord实例
    const wordRecords = this.convertToWordRecords(allWords, userWords);
    
    // 分类单词
    const { newWords, dueReviewWords, futureReviewWords } = this.categorizeWords(wordRecords);
    
    // 按优先级组合队列
    const queue: SimpleWordRecord[] = [];
    
    // 1. 优先添加过期复习词
    queue.push(...dueReviewWords.slice(0, this.config.reviewWords));
    
    // 2. 如果复习词不够，添加新词
    const remainingSlots = this.dailyLimit - queue.length;
    if (remainingSlots > 0) {
      queue.push(...newWords.slice(0, remainingSlots));
    }
    
    // 3. 如果还有空位，添加未来复习词
    const stillRemaining = this.dailyLimit - queue.length;
    if (stillRemaining > 0) {
      queue.push(...futureReviewWords.slice(0, stillRemaining));
    }
    
    return this.shuffleArray(queue);
  }

  /**
   * 转换为SimpleWordRecord实例
   */
  convertToWordRecords(allWords: WordData[], userWords: UserWordRecord[]): SimpleWordRecord[] {
    const userWordMap = new Map<string, UserWordRecord>();
    
    // 构建用户学习记录映射
    userWords.forEach(record => {
      userWordMap.set(record.wordId, record);
    });
    
    // 转换所有单词
    return allWords.map(word => {
      const userRecord = userWordMap.get(word._id);
      
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
  categorizeWords(wordRecords: SimpleWordRecord[]): CategorizedWords {
    const now = new Date();
    const newWords: SimpleWordRecord[] = [];
    const dueReviewWords: SimpleWordRecord[] = [];
    const futureReviewWords: SimpleWordRecord[] = [];
    
    wordRecords.forEach(record => {
      if (record.status === WORD_STATUS.new) {
        newWords.push(record);
      } else if (record.isDueForReview()) {
        dueReviewWords.push(record);
      } else {
        futureReviewWords.push(record);
      }
    });
    
    // 按优先级排序
    dueReviewWords.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime()); // 过期时间越长优先级越高
    futureReviewWords.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime()); // 即将到期的优先
    
    return { newWords, dueReviewWords, futureReviewWords };
  }

  /**
   * 打乱数组顺序
   */
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 获取学习统计
   */
  getStudyStats(wordRecords: SimpleWordRecord[]): StudyStats {
    const stats: StudyStats = {
      total: wordRecords.length,
      new: 0,
      learning: 0,
      reviewing: 0,
      mastered: 0,
      dueToday: 0,
      averageMastery: 0
    };
    
    let totalMastery = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    wordRecords.forEach(record => {
      (stats as any)[record.status]++;
      if (record.isDueForReview()) {
        stats.dueToday++;
      }
      totalMastery += record.getMasteryLevel();
    });
    
    stats.averageMastery = Math.floor(totalMastery / Math.max(1, stats.total));
    
    return stats;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.dailyLimit = this.config.newWords + this.config.reviewWords;
  }
}

/**
 * 默认调度器实例
 */
export const defaultScheduler = new SimpleReviewScheduler();

/**
 * 便捷函数：获取今日学习队列
 */
export function getDailyStudyQueue(
  allWords: WordData[], 
  userWords: UserWordRecord[], 
  config: SchedulerConfig = DAILY_CONFIGS.standard
): SimpleWordRecord[] {
  const scheduler = new SimpleReviewScheduler(config);
  return scheduler.getDailyStudyQueue(allWords, userWords);
}

/**
 * 便捷函数：获取学习统计
 */
export function getStudyStats(wordRecords: SimpleWordRecord[]): StudyStats {
  const scheduler = new SimpleReviewScheduler();
  return scheduler.getStudyStats(wordRecords);
}

/**
 * 便捷函数：处理用户选择
 */
export function processUserChoice(wordRecord: SimpleWordRecord, isKnown: boolean): SimpleWordRecord {
  if (isKnown) {
    wordRecord.markAsKnown();
  } else {
    wordRecord.markAsUnknown();
  }
  return wordRecord;
}