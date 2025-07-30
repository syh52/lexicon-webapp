/**
 * 智能学习计划优化器
 * 基于用户学习行为和表现动态调整学习计划
 */

import { DailyStudyPlan } from './DailyPlanGenerator';
import { StudySessionState } from './studySessionService';
import { UserSettings } from './userSettingsService';
import { SM2Card, SM2CardStatus, StudyChoice } from '../types';
import { getSM2MasteryLevel } from '../utils/sm2Algorithm';

export interface LearningAnalytics {
  // 用户学习行为分析
  averageStudyTime: number; // 平均学习时间（毫秒）
  completionRate: number; // 完成率（0-100）
  difficultyPreference: 'easy' | 'normal' | 'hard'; // 难度偏好
  
  // 学习效果分析
  retentionRate: number; // 记忆保持率
  learningEfficiency: number; // 学习效率评分（0-100）
  optimalStudyTime: number; // 最佳学习时长
  
  // 单词类型表现
  newWordPerformance: number; // 新词学习表现
  reviewWordPerformance: number; // 复习词表现
  
  // 建议调整
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'increase' | 'decrease' | 'maintain' | 'adjust';
  target: 'dailyTarget' | 'newWords' | 'reviewWords' | 'studySession';
  value: number;
  reason: string;
  confidence: number; // 置信度（0-100）
}

export interface OptimizedPlanConfig {
  // 动态调整的学习参数
  dailyTarget: number;
  newWordsRatio: number; // 新词占比（0-1）
  reviewWordsRatio: number; // 复习词占比（0-1）
  
  // 难度控制
  difficultyBalance: {
    easy: number; // 简单词汇占比
    normal: number; // 中等词汇占比
    hard: number; // 困难词汇占比
  };
  
  // 时间控制
  estimatedStudyTime: number; // 预估学习时间（分钟）
  sessionBreakdown: {
    warmup: number; // 热身时间占比
    core: number; // 核心学习占比
    review: number; // 复习巩固占比
  };
}

export class IntelligentPlanOptimizer {
  private static instance: IntelligentPlanOptimizer;
  
  static getInstance(): IntelligentPlanOptimizer {
    if (!IntelligentPlanOptimizer.instance) {
      IntelligentPlanOptimizer.instance = new IntelligentPlanOptimizer();
    }
    return IntelligentPlanOptimizer.instance;
  }

  /**
   * 分析用户学习行为并生成优化建议
   */
  async analyzeLearningPattern(
    userId: string,
    wordbookId: string,
    historicalSessions: StudySessionState[],
    sm2Cards: SM2Card[]
  ): Promise<LearningAnalytics> {
    try {
      console.log('🧠 开始分析用户学习模式...');

      // 1. 基础行为分析
      const behaviorAnalysis = this.analyzeBehaviorPatterns(historicalSessions);
      
      // 2. 学习效果分析
      const effectivenessAnalysis = this.analyzeEffectiveness(sm2Cards, historicalSessions);
      
      // 3. 难度偏好分析
      const difficultyAnalysis = this.analyzeDifficultyPreference(historicalSessions, sm2Cards);
      
      // 4. 时间分析
      const timeAnalysis = this.analyzeTimePatterns(historicalSessions);
      
      // 5. 生成优化建议
      const recommendations = this.generateRecommendations({
        ...behaviorAnalysis,
        ...effectivenessAnalysis,
        ...difficultyAnalysis,
        ...timeAnalysis
      });

      const analytics: LearningAnalytics = {
        averageStudyTime: behaviorAnalysis.averageStudyTime,
        completionRate: behaviorAnalysis.completionRate,
        difficultyPreference: difficultyAnalysis.difficultyPreference,
        retentionRate: effectivenessAnalysis.retentionRate,
        learningEfficiency: effectivenessAnalysis.learningEfficiency,
        optimalStudyTime: timeAnalysis.optimalStudyTime,
        newWordPerformance: effectivenessAnalysis.newWordPerformance,
        reviewWordPerformance: effectivenessAnalysis.reviewWordPerformance,
        recommendations
      };

      console.log('✅ 学习模式分析完成:', {
        efficiency: analytics.learningEfficiency,
        completionRate: analytics.completionRate,
        recommendationsCount: recommendations.length
      });

      return analytics;

    } catch (error) {
      console.error('❌ 学习模式分析失败:', error);
      return this.getDefaultAnalytics();
    }
  }

  /**
   * 根据分析结果优化学习计划
   */
  optimizeDailyPlan(
    originalPlan: DailyStudyPlan,
    analytics: LearningAnalytics,
    userSettings: UserSettings
  ): { optimizedPlan: DailyStudyPlan; changes: string[] } {
    try {
      console.log('🔧 开始优化学习计划...');

      const changes: string[] = [];
      const optimizedPlan = { ...originalPlan };

      // 1. 根据完成率调整每日目标
      if (analytics.completionRate < 60) {
        const reduction = Math.ceil(originalPlan.totalCount * 0.2);
        optimizedPlan.totalCount = Math.max(5, optimizedPlan.totalCount - reduction);
        optimizedPlan.plannedWords = optimizedPlan.plannedWords.slice(0, optimizedPlan.totalCount);
        changes.push(`降低每日目标 ${reduction} 个单词以提高完成率`);
      } else if (analytics.completionRate > 90 && analytics.learningEfficiency > 80) {
        const increase = Math.ceil(originalPlan.totalCount * 0.15);
        // 注意：这里需要额外的单词，实际实现时需要从单词库获取
        changes.push(`建议增加每日目标 ${increase} 个单词`);
      }

      // 2. 根据学习效率调整新词复习词比例
      if (analytics.newWordPerformance > analytics.reviewWordPerformance + 20) {
        optimizedPlan.newWordsCount = Math.min(
          optimizedPlan.totalCount,
          Math.ceil(optimizedPlan.newWordsCount * 1.2)
        );
        optimizedPlan.reviewWordsCount = optimizedPlan.totalCount - optimizedPlan.newWordsCount;
        changes.push('增加新词比例，减少复习词比例');
      } else if (analytics.reviewWordPerformance > analytics.newWordPerformance + 20) {
        optimizedPlan.reviewWordsCount = Math.min(
          optimizedPlan.totalCount,
          Math.ceil(optimizedPlan.reviewWordsCount * 1.2)
        );
        optimizedPlan.newWordsCount = optimizedPlan.totalCount - optimizedPlan.reviewWordsCount;
        changes.push('增加复习词比例，巩固已学知识');
      }

      // 3. 根据时间分析调整学习节奏
      if (analytics.averageStudyTime > analytics.optimalStudyTime * 1.5) {
        changes.push('建议分多次完成学习任务，避免疲劳');
      }

      // 4. 应用优化建议
      analytics.recommendations.forEach(rec => {
        if (rec.confidence > 70) {
          switch (rec.target) {
            case 'dailyTarget':
              if (rec.type === 'decrease' && optimizedPlan.totalCount > 5) {
                optimizedPlan.totalCount = Math.max(5, optimizedPlan.totalCount - rec.value);
                optimizedPlan.plannedWords = optimizedPlan.plannedWords.slice(0, optimizedPlan.totalCount);
                changes.push(rec.reason);
              }
              break;
            case 'newWords':
              if (rec.type === 'adjust') {
                optimizedPlan.newWordsCount = Math.min(optimizedPlan.totalCount, rec.value);
                changes.push(rec.reason);
              }
              break;
          }
        }
      });

      console.log('✅ 学习计划优化完成:', {
        originalTotal: originalPlan.totalCount,
        optimizedTotal: optimizedPlan.totalCount,
        changesCount: changes.length
      });

      return { optimizedPlan, changes };

    } catch (error) {
      console.error('❌ 学习计划优化失败:', error);
      return { optimizedPlan: originalPlan, changes: [] };
    }
  }

  /**
   * 生成智能复习提醒
   */
  generateReviewReminders(
    sm2Cards: SM2Card[],
    timezone: string = 'Asia/Shanghai'
  ): Array<{ wordId: string; word: string; reminderTime: Date; urgency: 'low' | 'medium' | 'high' }> {
    const now = new Date();
    const reminders: Array<{ wordId: string; word: string; reminderTime: Date; urgency: 'low' | 'medium' | 'high' }> = [];

    sm2Cards.forEach(card => {
      if (card.nextReview <= now) {
        const overdueDays = Math.floor((now.getTime() - card.nextReview.getTime()) / (24 * 60 * 60 * 1000));
        let urgency: 'low' | 'medium' | 'high' = 'low';
        
        if (overdueDays > 7) {
          urgency = 'high';
        } else if (overdueDays > 3) {
          urgency = 'medium';
        }

        // 计算下次提醒时间（基于遗忘曲线）
        const reminderTime = new Date(now.getTime() + (urgency === 'high' ? 2 : urgency === 'medium' ? 6 : 12) * 60 * 60 * 1000);

        reminders.push({
          wordId: card.wordId,
          word: card.wordId, // 实际实现中需要获取真实单词
          reminderTime,
          urgency
        });
      }
    });

    return reminders.sort((a, b) => b.urgency.localeCompare(a.urgency));
  }

  // 私有方法：行为模式分析
  private analyzeBehaviorPatterns(sessions: StudySessionState[]) {
    if (sessions.length === 0) {
      return {
        averageStudyTime: 0,
        completionRate: 0
      };
    }

    const studyTimes = sessions.map(s => s.lastUpdateTime - (s.createdAt?.getTime() || s.lastUpdateTime));
    const averageStudyTime = studyTimes.reduce((a, b) => a + b, 0) / studyTimes.length;
    
    const completionRate = sessions.filter(s => s.isCompleted).length / sessions.length * 100;

    return {
      averageStudyTime,
      completionRate
    };
  }

  // 私有方法：学习效果分析
  private analyzeEffectiveness(sm2Cards: SM2Card[], sessions: StudySessionState[]) {
    const retentionRate = this.calculateRetentionRate(sm2Cards);
    const learningEfficiency = this.calculateLearningEfficiency(sessions);
    const { newWordPerformance, reviewWordPerformance } = this.calculateWordTypePerformance(sessions);

    return {
      retentionRate,
      learningEfficiency,
      newWordPerformance,
      reviewWordPerformance
    };
  }

  // 私有方法：难度偏好分析
  private analyzeDifficultyPreference(sessions: StudySessionState[], sm2Cards: SM2Card[]) {
    let easyCount = 0, normalCount = 0, hardCount = 0;

    sm2Cards.forEach(card => {
      const masteryLevel = getSM2MasteryLevel(card);
      if (masteryLevel > 80) easyCount++;
      else if (masteryLevel > 40) normalCount++;
      else hardCount++;
    });

    const total = easyCount + normalCount + hardCount;
    if (total === 0) return { difficultyPreference: 'normal' as const };

    const easyRatio = easyCount / total;
    const hardRatio = hardCount / total;

    let difficultyPreference: 'easy' | 'normal' | 'hard' = 'normal';
    if (easyRatio > 0.6) difficultyPreference = 'easy';
    else if (hardRatio > 0.4) difficultyPreference = 'hard';

    return { difficultyPreference };
  }

  // 私有方法：时间模式分析
  private analyzeTimePatterns(sessions: StudySessionState[]) {
    if (sessions.length === 0) {
      return { optimalStudyTime: 15 * 60 * 1000 }; // 默认15分钟
    }

    const studyTimes = sessions.map(s => s.lastUpdateTime - (s.createdAt?.getTime() || s.lastUpdateTime));
    const completedSessions = sessions.filter(s => s.isCompleted);
    
    if (completedSessions.length === 0) {
      return { optimalStudyTime: 15 * 60 * 1000 };
    }

    const completedStudyTimes = studyTimes.slice(0, completedSessions.length);
    const averageCompletedTime = completedStudyTimes.reduce((a, b) => a + b, 0) / completedStudyTimes.length;

    return { optimalStudyTime: averageCompletedTime };
  }

  // 私有方法：生成优化建议
  private generateRecommendations(analysisData: any): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // 基于完成率的建议
    if (analysisData.completionRate < 50) {
      recommendations.push({
        type: 'decrease',
        target: 'dailyTarget',
        value: 3,
        reason: '完成率偏低，建议减少每日目标以建立学习信心',
        confidence: 85
      });
    }

    // 基于学习效率的建议
    if (analysisData.learningEfficiency < 60) {
      recommendations.push({
        type: 'adjust',
        target: 'studySession',
        value: 10,
        reason: '学习效率偏低，建议分多次短时间学习',
        confidence: 75
      });
    }

    // 基于单词类型表现的建议
    if (analysisData.newWordPerformance > analysisData.reviewWordPerformance + 15) {
      recommendations.push({
        type: 'increase',
        target: 'newWords',
        value: 2,
        reason: '新词学习表现良好，可适当增加新词比例',
        confidence: 70
      });
    }

    return recommendations;
  }

  // 私有方法：计算记忆保持率
  private calculateRetentionRate(sm2Cards: SM2Card[]): number {
    if (sm2Cards.length === 0) return 0;

    const masteredCards = sm2Cards.filter(card => 
      card.status === SM2CardStatus.Mastered || getSM2MasteryLevel(card) > 80
    );

    return (masteredCards.length / sm2Cards.length) * 100;
  }

  // 私有方法：计算学习效率（基于完成率和学习时长）
  private calculateLearningEfficiency(sessions: StudySessionState[]): number {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions.filter(s => s.isCompleted);
    const completionRate = (completedSessions.length / sessions.length) * 100;
    
    // 基于完成率计算学习效率
    return completionRate;
  }

  // 私有方法：计算单词类型表现（基于完成情况）
  private calculateWordTypePerformance(sessions: StudySessionState[]) {
    if (sessions.length === 0) {
      return { newWordPerformance: 50, reviewWordPerformance: 50 };
    }

    // 基于学习完成度评估表现
    const completedSessions = sessions.filter(s => s.isCompleted);
    const totalSessions = sessions.length;
    
    const performanceScore = (completedSessions.length / totalSessions) * 100;
    
    // 简化：新词和复习词表现基于整体完成率
    return { 
      newWordPerformance: performanceScore, 
      reviewWordPerformance: performanceScore 
    };
  }

  // 私有方法：获取默认分析结果
  private getDefaultAnalytics(): LearningAnalytics {
    return {
      averageStudyTime: 15 * 60 * 1000, // 15分钟
      completionRate: 50,
      difficultyPreference: 'normal',
      retentionRate: 50,
      learningEfficiency: 50,
      optimalStudyTime: 15 * 60 * 1000,
      newWordPerformance: 50,
      reviewWordPerformance: 50,
      recommendations: []
    };
  }
}

// 导出单例实例
export const intelligentPlanOptimizer = IntelligentPlanOptimizer.getInstance();