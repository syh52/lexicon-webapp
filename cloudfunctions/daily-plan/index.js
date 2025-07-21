const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 艾宾浩斯遗忘曲线间隔（天）
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

// 单词状态
const WORD_STATUS = {
  new: 'new',
  learning: 'learning',
  reviewing: 'reviewing',
  mastered: 'mastered'
};

// 简化的单词学习记录类
class SimpleWordRecord {
  constructor(wordId, word) {
    this.wordId = wordId;
    this.word = word;
    this.stage = 0;
    this.nextReview = new Date();
    this.failures = 0;
    this.successes = 0;
    this.lastReview = null;
    this.status = WORD_STATUS.new;
    this.createdAt = new Date();
  }

  markAsKnown() {
    this.successes++;
    this.lastReview = new Date();
    this.stage = Math.min(this.stage + 1, REVIEW_INTERVALS.length - 1);
    
    let interval = REVIEW_INTERVALS[this.stage];
    if (this.failures > 0) {
      interval = Math.max(1, Math.floor(interval * Math.pow(0.8, this.failures)));
    }
    
    this.nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    this.updateStatus();
  }

  markAsUnknown() {
    this.failures++;
    this.lastReview = new Date();
    this.stage = Math.max(0, this.stage - 1);
    this.nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.status = WORD_STATUS.learning;
  }

  updateStatus() {
    if (this.stage >= 6) {
      this.status = WORD_STATUS.mastered;
    } else if (this.stage >= 3) {
      this.status = WORD_STATUS.reviewing;
    } else {
      this.status = WORD_STATUS.learning;
    }
  }

  isDueForReview() {
    return new Date() >= this.nextReview;
  }
}

// 每日学习计划生成器
class DailyPlanGenerator {
  static generateDailyPlan(userId, wordbookId, userSettings, allWords, userStudyRecords, date) {
    console.log('开始生成每日学习计划', { userId, wordbookId, date });
    
    const wordRecords = this.convertToWordRecords(allWords, userStudyRecords);
    const { newWords, reviewWords, overdueWords } = this.categorizeWords(wordRecords);
    const prioritizedWords = this.calculatePriorities(newWords, reviewWords, overdueWords);
    const selectedWords = this.selectWordsForPlan(prioritizedWords, userSettings);
    
    const plan = {
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
    
    console.log('生成每日学习计划完成:', {
      totalCount: plan.totalCount,
      newWords: plan.newWordsCount,
      reviewWords: plan.reviewWordsCount
    });
    
    return plan;
  }

  static convertToWordRecords(allWords, userStudyRecords) {
    const userRecordMap = new Map();
    userStudyRecords.forEach(record => {
      userRecordMap.set(record.wordId, record);
    });
    
    return allWords.map(word => {
      const userRecord = userRecordMap.get(word._id);
      
      if (userRecord) {
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
        return new SimpleWordRecord(word._id, word.word);
      }
    });
  }

  static categorizeWords(wordRecords) {
    const now = new Date();
    const newWords = [];
    const reviewWords = [];
    const overdueWords = [];
    
    wordRecords.forEach(record => {
      if (record.status === WORD_STATUS.new) {
        newWords.push(record);
      } else if (record.status === WORD_STATUS.mastered) {
        return;
      } else if (record.isDueForReview()) {
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

  static calculatePriorities(newWords, reviewWords, overdueWords) {
    const now = new Date();
    const priorities = [];
    
    // 过期单词 - 最高优先级
    overdueWords.forEach(word => {
      const overdueDays = Math.floor((now.getTime() - word.nextReview.getTime()) / (24 * 60 * 60 * 1000));
      const failurePenalty = word.failures * 0.2;
      const priority = 1000 + overdueDays * 10 + failurePenalty;
      
      priorities.push({
        wordId: word.wordId,
        word: word.word,
        priority,
        type: 'overdue'
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
        type: 'review'
      });
    });
    
    // 新单词 - 基础优先级
    newWords.forEach(word => {
      const priority = 100 + Math.random() * 50;
      
      priorities.push({
        wordId: word.wordId,
        word: word.word,
        priority,
        type: 'new'
      });
    });
    
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  static selectWordsForPlan(prioritizedWords, userSettings) {
    const selectedWords = [];
    
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
}

exports.main = async (event, context) => {
  const { action, userId, wordbookId, date, wordId, isKnown, studyTime } = event;
  
  try {
    switch (action) {
      case 'get':
        return await getDailyPlan(userId, wordbookId, date);
      case 'create':
        return await createDailyPlan(userId, wordbookId, date);
      case 'update':
        return await updateStudyProgress(userId, wordbookId, wordId, isKnown, studyTime);
      case 'progress':
        return await getCurrentProgress(userId, wordbookId);
      case 'stats':
        return await getStudyStats(userId, wordbookId);
      default:
        return {
          success: false,
          error: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('每日计划云函数错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取每日计划
async function getDailyPlan(userId, wordbookId, date) {
  if (!userId || !wordbookId || !date) {
    throw new Error('参数不完整');
  }
  
  const { data } = await db.collection('daily_study_plans')
    .where({ userId, wordbookId, date })
    .get();
  
  if (data && data.length > 0) {
    return {
      success: true,
      data: data[0]
    };
  }
  
  return {
    success: false,
    error: '未找到学习计划'
  };
}

// 创建每日计划
async function createDailyPlan(userId, wordbookId, date) {
  if (!userId || !wordbookId || !date) {
    throw new Error('参数不完整');
  }
  
  // 获取用户设置
  const userSettingsResult = await cloud.callFunction({
    name: 'user-settings',
    data: { action: 'get', userId }
  });
  
  if (!userSettingsResult.result.success) {
    throw new Error('获取用户设置失败');
  }
  
  const userSettings = userSettingsResult.result.data;
  
  // 获取单词数据
  const wordsResult = await cloud.callFunction({
    name: 'getWordsByWordbook',
    data: { wordbookId, limit: 1000 }
  });
  
  if (!wordsResult.result.success) {
    throw new Error('获取单词数据失败');
  }
  
  const words = wordsResult.result.data;
  
  // 获取用户学习记录
  const { data: studyRecords } = await db.collection('reviews')
    .where({ uid: userId, wordbookId })
    .get();
  
  // 生成学习计划
  const plan = DailyPlanGenerator.generateDailyPlan(
    userId,
    wordbookId,
    userSettings,
    words,
    studyRecords || [],
    date
  );
  
  // 保存到数据库
  await db.collection('daily_study_plans').add(plan);
  
  return {
    success: true,
    data: plan
  };
}

// 更新学习进度
async function updateStudyProgress(userId, wordbookId, wordId, isKnown, studyTime = 0) {
  if (!userId || !wordbookId || !wordId) {
    throw new Error('参数不完整');
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  // 获取当前计划
  const { data: plans } = await db.collection('daily_study_plans')
    .where({ userId, wordbookId, date: today })
    .get();
  
  if (!plans || plans.length === 0) {
    throw new Error('未找到今日学习计划');
  }
  
  const currentPlan = plans[0];
  
  // 更新计划进度
  if (!currentPlan.completedWords.includes(wordId)) {
    currentPlan.completedWords.push(wordId);
    currentPlan.completedCount = currentPlan.completedWords.length;
  }
  
  // 更新当前索引
  if (currentPlan.currentIndex < currentPlan.plannedWords.length - 1) {
    currentPlan.currentIndex++;
  }
  
  // 更新统计信息
  if (isKnown) {
    currentPlan.stats.knownCount++;
  } else {
    currentPlan.stats.unknownCount++;
  }
  
  currentPlan.stats.studyTime += studyTime;
  
  // 计算准确率
  const totalAnswered = currentPlan.stats.knownCount + currentPlan.stats.unknownCount;
  if (totalAnswered > 0) {
    currentPlan.stats.accuracy = (currentPlan.stats.knownCount / totalAnswered) * 100;
  }
  
  // 检查是否完成
  if (currentPlan.completedCount >= currentPlan.totalCount) {
    currentPlan.isCompleted = true;
    currentPlan.completedAt = new Date();
  }
  
  currentPlan.updatedAt = new Date();
  
  // 保存到数据库
  await db.collection('daily_study_plans')
    .doc(currentPlan._id)
    .update(currentPlan);
  
  return {
    success: true,
    data: currentPlan
  };
}

// 获取当前进度
async function getCurrentProgress(userId, wordbookId) {
  if (!userId || !wordbookId) {
    throw new Error('参数不完整');
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: plans } = await db.collection('daily_study_plans')
    .where({ userId, wordbookId, date: today })
    .get();
  
  if (!plans || plans.length === 0) {
    return {
      success: true,
      data: {
        plan: null,
        nextWord: null,
        progress: 0,
        isCompleted: false
      }
    };
  }
  
  const plan = plans[0];
  const nextWord = plan.currentIndex < plan.plannedWords.length 
    ? plan.plannedWords[plan.currentIndex]
    : null;
  
  const progress = plan.totalCount > 0 
    ? (plan.completedCount / plan.totalCount) * 100
    : 0;
  
  return {
    success: true,
    data: {
      plan,
      nextWord,
      progress,
      isCompleted: plan.isCompleted
    }
  };
}

// 获取学习统计
async function getStudyStats(userId, wordbookId, days = 7) {
  if (!userId || !wordbookId) {
    throw new Error('参数不完整');
  }
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  const { data } = await db.collection('daily_study_plans')
    .where({
      userId,
      wordbookId,
      date: db.command.gte(startDate.toISOString().split('T')[0])
    })
    .orderBy('date', 'desc')
    .get();
  
  const stats = (data || []).map(plan => ({
    date: plan.date,
    totalPlanned: plan.totalCount,
    totalCompleted: plan.completedCount,
    accuracy: plan.stats.accuracy,
    studyTime: plan.stats.studyTime,
    isTargetReached: plan.isCompleted
  }));
  
  return {
    success: true,
    data: stats
  };
}