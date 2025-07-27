/**
 * SM-2 间隔重复算法实现
 * 基于SuperMemo 2算法，适配背单词场景
 * 支持"认识"/"提示"/"不认识"三种用户反馈
 */

// SM-2卡片状态接口
export interface SM2Card {
  wordId: string;
  repetitions: number;    // 已复习次数
  EF: number;            // 易记因子 (Ease Factor)
  interval: number;      // 当前间隔天数
  nextReview: Date;      // 下次复习日期
  lastReview?: Date;     // 上次复习时间
  status: SM2CardStatus; // 卡片状态
  createdAt: Date;       // 创建时间
  updatedAt?: Date;      // 最后更新时间
}

// 卡片状态枚举
export enum SM2CardStatus {
  New = 'new',           // 新单词
  Learning = 'learning', // 学习中
  Review = 'review',     // 复习中
  Mastered = 'mastered'  // 已掌握
}

// 用户选择类型
export enum StudyChoice {
  Know = 'know',         // 认识（质量=5）
  Hint = 'hint',         // 提示后认识（质量=3）
  Unknown = 'unknown'    // 不认识（质量=0-1）
}

// 质量评分映射
export const QUALITY_MAPPING = {
  [StudyChoice.Know]: 5,     // 完全记住，无任何困难
  [StudyChoice.Hint]: 3,     // 回忆正确，但过程较艰难
  [StudyChoice.Unknown]: 1   // 回忆错误，看到答案后记起曾学过
} as const;

// 最小EF值
const MIN_EF = 1.3;

// 初始EF值
const INITIAL_EF = 2.5;

/**
 * SM-2算法调度器
 */
export class SM2Scheduler {
  
  /**
   * 初始化新卡片
   */
  initCard(wordId: string, currentDate: Date = new Date()): SM2Card {
    return {
      wordId,
      repetitions: 0,
      EF: INITIAL_EF,
      interval: 0,
      nextReview: new Date(currentDate),
      status: SM2CardStatus.New,
      createdAt: new Date(currentDate)
    };
  }

  /**
   * 处理用户学习反馈，更新卡片状态
   */
  processReview(
    card: SM2Card, 
    choice: StudyChoice, 
    currentDate: Date = new Date()
  ): SM2Card {
    const quality = QUALITY_MAPPING[choice];
    const updatedCard = { ...card };
    
    // 更新最后复习时间
    updatedCard.lastReview = new Date(currentDate);
    updatedCard.updatedAt = new Date(currentDate);

    if (quality >= 3) {
      // 回忆成功
      this.handleSuccessfulReview(updatedCard, quality, currentDate);
    } else {
      // 回忆失败
      this.handleFailedReview(updatedCard, currentDate);
    }

    // 更新卡片状态
    this.updateCardStatus(updatedCard);
    
    return updatedCard;
  }

  /**
   * 处理成功复习
   */
  private handleSuccessfulReview(card: SM2Card, quality: number, currentDate: Date): void {
    // 增加复习次数
    card.repetitions++;

    // 更新EF值
    card.EF = this.calculateNewEF(card.EF, quality);

    // 计算下次复习间隔
    if (card.repetitions === 1) {
      card.interval = 1; // 第一次复习间隔1天
    } else if (card.repetitions === 2) {
      card.interval = 6; // 第二次复习间隔6天
    } else {
      // 后续复习：interval = 上次间隔 × EF
      card.interval = Math.round(card.interval * card.EF);
    }

    // 设置下次复习时间
    card.nextReview = new Date(currentDate.getTime() + card.interval * 24 * 60 * 60 * 1000);
  }

  /**
   * 处理失败复习
   */
  private handleFailedReview(card: SM2Card, currentDate: Date): void {
    // 重置复习次数和间隔
    card.repetitions = 0;
    card.interval = 1;
    
    // 明天重新复习
    card.nextReview = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * 计算新的EF值
   * EF = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
   */
  private calculateNewEF(currentEF: number, quality: number): number {
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(MIN_EF, newEF);
  }

  /**
   * 更新卡片状态
   */
  private updateCardStatus(card: SM2Card): void {
    if (card.repetitions === 0) {
      card.status = SM2CardStatus.New;
    } else if (card.repetitions >= 1 && card.repetitions < 3) {
      card.status = SM2CardStatus.Learning;
    } else if (card.repetitions >= 3 && card.repetitions < 6) {
      card.status = SM2CardStatus.Review;
    } else {
      card.status = SM2CardStatus.Mastered;
    }
  }

  /**
   * 检查是否需要复习
   */
  isDue(card: SM2Card, currentDate: Date = new Date()): boolean {
    return currentDate >= card.nextReview;
  }

  /**
   * 获取卡片掌握程度（0-100）
   */
  getMasteryLevel(card: SM2Card): number {
    const statusWeight = {
      [SM2CardStatus.New]: 0,
      [SM2CardStatus.Learning]: 25,
      [SM2CardStatus.Review]: 60,
      [SM2CardStatus.Mastered]: 100
    };
    
    const baseLevel = statusWeight[card.status];
    const efBonus = Math.min(20, (card.EF - MIN_EF) / (4.0 - MIN_EF) * 20);
    
    return Math.min(100, Math.round(baseLevel + efBonus));
  }

  /**
   * 获取难度描述
   */
  getDifficultyLabel(card: SM2Card): string {
    if (card.EF >= 2.8) return '简单';
    if (card.EF >= 2.3) return '一般';
    if (card.EF >= 1.8) return '困难';
    return '非常困难';
  }
}

/**
 * 每日学习会话管理器
 * 处理当日重复机制
 */
export class DailyStudySession {
  private reviewQueue: SM2Card[] = [];
  private completedCards: SM2Card[] = [];
  private repeatQueue: SM2Card[] = []; // 当天需要重复的卡片
  private scheduler = new SM2Scheduler();

  constructor(cards: SM2Card[]) {
    this.reviewQueue = [...cards];
  }

  /**
   * 获取当前要学习的卡片
   */
  getCurrentCard(): SM2Card | null {
    if (this.reviewQueue.length > 0) {
      return this.reviewQueue[0];
    }
    if (this.repeatQueue.length > 0) {
      return this.repeatQueue[0];
    }
    return null;
  }

  /**
   * 处理用户选择
   */
  processChoice(choice: StudyChoice, currentDate: Date = new Date()): SM2Card {
    const currentCard = this.getCurrentCard();
    if (!currentCard) {
      throw new Error('没有可学习的卡片');
    }

    // 使用SM-2算法处理选择
    const updatedCard = this.scheduler.processReview(currentCard, choice, currentDate);

    // 从队列中移除当前卡片
    if (this.reviewQueue.length > 0 && this.reviewQueue[0].wordId === currentCard.wordId) {
      this.reviewQueue.shift();
    } else if (this.repeatQueue.length > 0 && this.repeatQueue[0].wordId === currentCard.wordId) {
      this.repeatQueue.shift();
    }

    // 根据选择结果决定后续处理
    if (choice === StudyChoice.Unknown) {
      // 不认识的卡片需要当天重复
      this.repeatQueue.push(updatedCard);
    } else if (choice === StudyChoice.Hint) {
      // 使用提示的卡片也需要再次验证（可选）
      // 可以选择在当天稍后重复，或者接受为完成
      this.completedCards.push(updatedCard);
    } else {
      // 认识的卡片直接完成
      this.completedCards.push(updatedCard);
    }

    return updatedCard;
  }

  /**
   * 获取会话统计
   */
  getSessionStats() {
    const total = this.reviewQueue.length + this.completedCards.length + this.repeatQueue.length;
    const completed = this.completedCards.length;
    const remaining = this.reviewQueue.length + this.repeatQueue.length;
    
    const choiceStats = this.completedCards.reduce(
      (stats, card) => {
        // 根据最后的状态推断选择类型
        if (card.repetitions === 0) {
          stats.unknown++;
        } else if (card.EF < INITIAL_EF) {
          stats.hint++;
        } else {
          stats.know++;
        }
        return stats;
      },
      { know: 0, hint: 0, unknown: 0 }
    );

    return {
      total,
      completed,
      remaining,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      choiceStats,
      isCompleted: remaining === 0
    };
  }

  /**
   * 检查会话是否完成
   */
  isCompleted(): boolean {
    return this.reviewQueue.length === 0 && this.repeatQueue.length === 0;
  }

  /**
   * 获取所有完成的卡片
   */
  getCompletedCards(): SM2Card[] {
    return [...this.completedCards];
  }

  /**
   * 获取所有卡片（用于会话状态保存）
   */
  getAllCards(): SM2Card[] {
    return [...this.reviewQueue, ...this.repeatQueue, ...this.completedCards];
  }
}

// 便捷函数导出

/**
 * 创建新的SM-2卡片
 */
export function createSM2Card(wordId: string, currentDate?: Date): SM2Card {
  const scheduler = new SM2Scheduler();
  return scheduler.initCard(wordId, currentDate);
}

/**
 * 处理单次学习反馈
 */
export function processSM2Review(
  card: SM2Card, 
  choice: StudyChoice, 
  currentDate?: Date
): SM2Card {
  const scheduler = new SM2Scheduler();
  return scheduler.processReview(card, choice, currentDate);
}

/**
 * 检查卡片是否到期需要复习
 */
export function isSM2CardDue(card: SM2Card, currentDate?: Date): boolean {
  const scheduler = new SM2Scheduler();
  return scheduler.isDue(card, currentDate);
}

/**
 * 获取卡片掌握程度
 */
export function getSM2MasteryLevel(card: SM2Card): number {
  const scheduler = new SM2Scheduler();
  return scheduler.getMasteryLevel(card);
}

/**
 * 创建每日学习会话
 */
export function createDailyStudySession(cards: SM2Card[]): DailyStudySession {
  return new DailyStudySession(cards);
}

// 默认导出调度器实例
export const defaultSM2Scheduler = new SM2Scheduler();