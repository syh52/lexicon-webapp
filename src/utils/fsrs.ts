/**
 * FSRS (Free Spaced Repetition Scheduler) 核心算法
 * 基于 fsrs4anki 项目改编，适配Web环境
 */

// FSRS参数接口
export interface FSRSParams {
  w: number[];
  requestRetention: number;
  maximumInterval: number;
  enableFuzz: boolean;
}

// 默认FSRS参数 (来自fsrs4anki项目)
export const DEFAULT_FSRS_PARAMS: FSRSParams = {
  w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
  requestRetention: 0.9,
  maximumInterval: 36500,
  enableFuzz: true
};

// 评分定义
export const RATINGS = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4
} as const;

export type Rating = typeof RATINGS[keyof typeof RATINGS];

// 卡片状态
export const CARD_STATUS = {
  new: 'new',
  learning: 'learning',
  review: 'review',
  relearning: 'relearning'
} as const;

export type CardStatus = typeof CARD_STATUS[keyof typeof CARD_STATUS];

// FSRS卡片接口
export interface FSRSCard {
  difficulty: number;
  stability: number;
  retrievability: number;
  status: CardStatus;
  due: Date;
  lapses: number;
  reps: number;
  elapsedDays: number;
  scheduledDays: number;
  seed: number;
}

// 学习建议接口
export interface StudyAdvice {
  difficulty: string;
  retrievability: number | null;
  suggestions: {
    [key: string]: {
      interval: number;
      due: Date;
      stability: number;
    };
  };
}

// 下一状态接口
export type NextStates = {
  [K in keyof typeof RATINGS]: FSRSCard;
};

/**
 * FSRS调度器类
 */
export class FSRSScheduler {
  private params: FSRSParams;
  private w: number[];
  private requestRetention: number;
  private maximumInterval: number;
  private enableFuzz: boolean;
  private DECAY: number;
  private FACTOR: number;

  constructor(params: Partial<FSRSParams> = {}) {
    this.params = { ...DEFAULT_FSRS_PARAMS, ...params };
    this.w = this.params.w;
    this.requestRetention = this.params.requestRetention;
    this.maximumInterval = this.params.maximumInterval;
    this.enableFuzz = this.params.enableFuzz;
    
    // 计算常数
    this.DECAY = -this.w[20];
    this.FACTOR = Math.pow(0.9, 1 / this.DECAY) - 1;
  }

  /**
   * 为新卡片初始化FSRS状态
   */
  initCard(): FSRSCard {
    return {
      difficulty: this.initDifficulty(RATINGS.good),
      stability: this.initStability(RATINGS.good),
      retrievability: 0,
      status: CARD_STATUS.new,
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: Math.floor(Math.random() * 10000)
    };
  }

  /**
   * 根据评分调度卡片
   */
  schedule(card: FSRSCard, rating: Rating): FSRSCard {
    const currentTime = new Date();
    const elapsedDays = card.due ? 
      Math.max(0, (currentTime.getTime() - new Date(card.due).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    let newCard: FSRSCard = { ...card };
    newCard.reps = (newCard.reps || 0) + 1;
    newCard.elapsedDays = elapsedDays;
    
    // 计算回忆率
    if (newCard.status === CARD_STATUS.review) {
      newCard.retrievability = this.forgettingCurve(elapsedDays, newCard.stability);
    }
    
    // 根据评分更新状态
    if (rating === RATINGS.again) {
      newCard = { ...this.handleAgain(newCard) };
    } else {
      newCard = { ...this.handlePass(newCard, rating) };
    }
    
    // 设置下次复习时间
    newCard.due = new Date(currentTime.getTime() + newCard.scheduledDays * 24 * 60 * 60 * 1000);
    
    return newCard;
  }

  /**
   * 处理"再次"评分
   */
  private handleAgain(card: FSRSCard): FSRSCard {
    const newCard = { ...card };
    newCard.lapses = (newCard.lapses || 0) + 1;
    
    // 更新状态
    if (newCard.status === CARD_STATUS.new) {
      newCard.status = CARD_STATUS.learning;
    } else {
      newCard.status = CARD_STATUS.relearning;
    }
    
    // 更新难度和稳定性
    newCard.difficulty = this.nextDifficulty(newCard.difficulty, RATINGS.again);
    
    if (newCard.status === CARD_STATUS.relearning) {
      newCard.stability = this.nextForgetStability(
        newCard.difficulty,
        newCard.stability,
        newCard.retrievability
      );
    } else {
      newCard.stability = this.nextShortTermStability(newCard.stability, RATINGS.again);
    }
    
    // 设置间隔
    newCard.scheduledDays = this.enableFuzz ? 
      this.applyFuzz(1) : 1;
    
    return newCard;
  }

  /**
   * 处理通过评分 (Hard, Good, Easy)
   */
  private handlePass(card: FSRSCard, rating: Rating): FSRSCard {
    const newCard = { ...card };
    
    // 更新状态
    if (newCard.status === CARD_STATUS.new) {
      newCard.status = CARD_STATUS.learning;
    } else if (newCard.status === CARD_STATUS.learning || newCard.status === CARD_STATUS.relearning) {
      newCard.status = CARD_STATUS.review;
    }
    
    // 更新难度
    newCard.difficulty = this.nextDifficulty(newCard.difficulty, rating);
    
    // 更新稳定性
    if (newCard.status === CARD_STATUS.learning) {
      newCard.stability = this.nextShortTermStability(newCard.stability, rating);
    } else {
      newCard.stability = this.nextRecallStability(
        newCard.difficulty,
        newCard.stability,
        newCard.retrievability,
        rating
      );
    }
    
    // 计算下次间隔
    newCard.scheduledDays = this.nextInterval(newCard.stability);
    
    return newCard;
  }

  /**
   * 计算初始难度
   */
  private initDifficulty(rating: Rating): number {
    return Math.max(1, Math.min(10, 
      this.w[4] - Math.exp(this.w[5] * (rating - 1)) + 1
    ));
  }

  /**
   * 计算初始稳定性
   */
  private initStability(rating: Rating): number {
    return Math.max(0.1, this.w[rating - 1]);
  }

  /**
   * 计算下一个难度
   */
  private nextDifficulty(difficulty: number, rating: Rating): number {
    const deltaD = -this.w[6] * (rating - 3);
    const nextD = difficulty + this.linearDamping(deltaD, difficulty);
    return Math.max(1, Math.min(10, this.meanReversion(this.initDifficulty(4), nextD)));
  }

  /**
   * 线性阻尼
   */
  private linearDamping(deltaD: number, oldD: number): number {
    return deltaD * (10 - oldD) / 9;
  }

  /**
   * 均值回归
   */
  private meanReversion(init: number, current: number): number {
    return this.w[7] * init + (1 - this.w[7]) * current;
  }

  /**
   * 计算下一个回忆稳定性
   */
  private nextRecallStability(difficulty: number, stability: number, retrievability: number, rating: Rating): number {
    const hardPenalty = rating === RATINGS.hard ? this.w[15] : 1;
    const easyBonus = rating === RATINGS.easy ? this.w[16] : 1;
    
    return stability * (1 + Math.exp(this.w[8]) *
      (11 - difficulty) *
      Math.pow(stability, -this.w[9]) *
      (Math.exp((1 - retrievability) * this.w[10]) - 1) *
      hardPenalty *
      easyBonus);
  }

  /**
   * 计算下一个遗忘稳定性
   */
  private nextForgetStability(difficulty: number, stability: number, retrievability: number): number {
    const sMin = stability / Math.exp(this.w[17] * this.w[18]);
    
    return Math.min(
      this.w[11] *
      Math.pow(difficulty, -this.w[12]) *
      (Math.pow(stability + 1, this.w[13]) - 1) *
      Math.exp((1 - retrievability) * this.w[14]),
      sMin
    );
  }

  /**
   * 计算下一个短期稳定性
   */
  private nextShortTermStability(stability: number, rating: Rating): number {
    const sinc = Math.exp(this.w[17] * (rating - 3 + this.w[18])) * 
                Math.pow(stability, -this.w[19]);
    
    return stability * (rating >= 3 ? Math.max(sinc, 1) : sinc);
  }

  /**
   * 计算下次间隔
   */
  private nextInterval(stability: number): number {
    const interval = stability / this.FACTOR * 
      (Math.pow(this.requestRetention, 1 / this.DECAY) - 1);
    
    let finalInterval = Math.max(1, Math.min(this.maximumInterval, Math.round(interval)));
    
    if (this.enableFuzz) {
      finalInterval = this.applyFuzz(finalInterval);
    }
    
    return finalInterval;
  }

  /**
   * 应用模糊化
   */
  private applyFuzz(interval: number): number {
    if (interval < 2.5) return interval;
    
    const minInterval = Math.max(2, Math.round(interval * 0.95 - 1));
    const maxInterval = Math.round(interval * 1.05 + 1);
    
    return Math.floor(Math.random() * (maxInterval - minInterval + 1) + minInterval);
  }

  /**
   * 遗忘曲线
   */
  private forgettingCurve(elapsedDays: number, stability: number): number {
    return Math.pow(1 + this.FACTOR * elapsedDays / stability, this.DECAY);
  }

  /**
   * 计算所有可能的评分结果
   */
  getNextStates(card: FSRSCard): NextStates {
    const states = {} as NextStates;
    
    for (const [ratingName, rating] of Object.entries(RATINGS)) {
      states[ratingName as keyof typeof RATINGS] = this.schedule(card, rating);
    }
    
    return states;
  }

  /**
   * 获取学习建议
   */
  getStudyAdvice(card: FSRSCard): StudyAdvice {
    const states = this.getNextStates(card);
    const advice: StudyAdvice = {
      difficulty: this.getDifficultyLabel(card.difficulty),
      retrievability: card.retrievability ? Math.round(card.retrievability * 100) : null,
      suggestions: {}
    };
    
    for (const [rating, state] of Object.entries(states)) {
      advice.suggestions[rating] = {
        interval: state.scheduledDays,
        due: state.due,
        stability: Math.round(state.stability * 100) / 100
      };
    }
    
    return advice;
  }

  /**
   * 获取难度标签
   */
  private getDifficultyLabel(difficulty: number): string {
    if (difficulty <= 3) return '简单';
    if (difficulty <= 5) return '一般';
    if (difficulty <= 7) return '困难';
    return '非常困难';
  }
}

/**
 * 创建默认调度器实例
 */
export const defaultScheduler = new FSRSScheduler();

/**
 * 便捷函数：调度卡片
 */
export function scheduleCard(card: FSRSCard, rating: Rating, params: Partial<FSRSParams> | null = null): FSRSCard {
  const scheduler = params ? new FSRSScheduler(params) : defaultScheduler;
  return scheduler.schedule(card, rating);
}

/**
 * 便捷函数：初始化新卡片
 */
export function initNewCard(params: Partial<FSRSParams> | null = null): FSRSCard {
  const scheduler = params ? new FSRSScheduler(params) : defaultScheduler;
  return scheduler.initCard();
}

/**
 * 便捷函数：获取下一个状态
 */
export function getNextStates(card: FSRSCard, params: Partial<FSRSParams> | null = null): NextStates {
  const scheduler = params ? new FSRSScheduler(params) : defaultScheduler;
  return scheduler.getNextStates(card);
}

/**
 * 便捷函数：获取学习建议
 */
export function getStudyAdvice(card: FSRSCard, params: Partial<FSRSParams> | null = null): StudyAdvice {
  const scheduler = params ? new FSRSScheduler(params) : defaultScheduler;
  return scheduler.getStudyAdvice(card);
}