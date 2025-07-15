/**
 * FSRS服务云函数
 * 处理间隔重复学习的核心逻辑
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

// 默认FSRS参数
const DEFAULT_FSRS_PARAMS = {
  w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
  requestRetention: 0.9,
  maximumInterval: 36500
};

// 评分映射
const RATINGS = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4
};

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'getDueCards':
        return await getDueCards(data);
      case 'submitReview':
        return await submitReview(data);
      case 'getUserFSRSParams':
        return await getUserFSRSParams(data);
      case 'optimizeParameters':
        return await optimizeParameters(data);
      case 'getStudyStats':
        return await getStudyStats(data);
      default:
        throw new Error(`不支持的操作: ${action}`);
    }
  } catch (error) {
    console.error('FSRS服务错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 获取待复习的卡片
 * 修复：使用正确的数据库集合结构
 */
async function getDueCards(data) {
  const { userId, wordbookId, limit = 20 } = data;
  const now = new Date();
  
  try {
    // 1. 从words集合获取词汇数据
    const wordsResult = await db.collection('words')
      .where({
        wordbookId: wordbookId
      })
      .get();
    
    const words = wordsResult.data || [];
    
    // 2. 从reviews集合获取用户的学习记录
    const reviewsResult = await db.collection('reviews')
      .where({
        uid: userId,
        wordbookId: wordbookId
      })
      .get();
    
    const reviews = reviewsResult.data || [];
    
    // 3. 合并数据，创建虚拟卡片
    const cards = words.map(word => {
      const review = reviews.find(r => r.wordId === word._id);
      
      let fsrsData;
      if (review) {
        // 使用现有的学习记录
        fsrsData = {
          difficulty: review.difficulty || 6.0,
          stability: review.stability || 1.0,
          retrievability: review.retrievability || 0,
          status: review.status || 'new',
          due: review.due || now,
          lapses: review.lapses || 0,
          reps: review.reps || 0,
          elapsedDays: review.elapsedDays || 0,
          scheduledDays: review.scheduledDays || 0
        };
      } else {
        // 新卡片，使用默认FSRS状态
        fsrsData = {
          difficulty: 6.0,
          stability: 1.0,
          retrievability: 0,
          status: 'new',
          due: now,
          lapses: 0,
          reps: 0,
          elapsedDays: 0,
          scheduledDays: 0
        };
      }
      
      return {
        _id: `card_${userId}_${word._id}`,
        userId: userId,
        wordbookId: wordbookId,
        wordId: word._id,
        word: word.word,
        fsrs: fsrsData,
        wordData: word
      };
    });
    
    // 4. 筛选到期的卡片
    const dueCards = cards.filter(card => 
      card.fsrs.status === 'new' || new Date(card.fsrs.due) <= now
    );
    
    // 5. 按优先级排序并限制数量
    const sortedCards = dueCards
      .sort((a, b) => {
        if (a.fsrs.status === 'new' && b.fsrs.status !== 'new') return -1;
        if (a.fsrs.status !== 'new' && b.fsrs.status === 'new') return 1;
        return new Date(a.fsrs.due) - new Date(b.fsrs.due);
      })
      .slice(0, limit);
    
    return {
      success: true,
      data: sortedCards
    };
    
  } catch (error) {
    throw new Error(`获取待复习卡片失败: ${error.message}`);
  }
}

/**
 * 提交复习结果
 * 修复：使用正确的数据库集合结构
 */
async function submitReview(data) {
  const { userId, cardId, rating, timeSpent } = data;
  const reviewTime = new Date();
  
  try {
    // 解析cardId获取wordId
    const wordId = cardId.replace(`card_${userId}_`, '');
    
    // 1. 获取单词数据
    const wordResult = await db.collection('words').doc(wordId).get();
    if (!wordResult.data) {
      throw new Error('单词不存在');
    }
    const word = wordResult.data;
    
    // 2. 获取现有的学习记录
    const reviewsResult = await db.collection('reviews')
      .where({
        uid: userId,
        wordId: wordId,
        wordbookId: word.wordbookId
      })
      .get();
    
    let currentFsrsState;
    if (reviewsResult.data && reviewsResult.data.length > 0) {
      const existingReview = reviewsResult.data[0];
      currentFsrsState = {
        difficulty: existingReview.difficulty || 6.0,
        stability: existingReview.stability || 1.0,
        retrievability: existingReview.retrievability || 0,
        status: existingReview.status || 'new',
        due: existingReview.due || reviewTime,
        lapses: existingReview.lapses || 0,
        reps: existingReview.reps || 0,
        elapsedDays: existingReview.elapsedDays || 0,
        scheduledDays: existingReview.scheduledDays || 0
      };
    } else {
      // 新卡片的默认状态
      currentFsrsState = {
        difficulty: 6.0,
        stability: 1.0,
        retrievability: 0,
        status: 'new',
        due: reviewTime,
        lapses: 0,
        reps: 0,
        elapsedDays: 0,
        scheduledDays: 0
      };
    }
    
    // 3. 获取用户FSRS参数
    const userParams = await getUserFSRSParams({ userId, wordbookId: word.wordbookId });
    const params = userParams.data || DEFAULT_FSRS_PARAMS;
    
    // 4. 计算新的FSRS状态
    const beforeState = { ...currentFsrsState };
    const afterState = calculateNextState(beforeState, rating, params);
    
    // 5. 更新或创建学习记录
    const reviewRecord = {
      uid: userId,
      wordId: wordId,
      wordbookId: word.wordbookId,
      difficulty: afterState.difficulty,
      stability: afterState.stability,
      retrievability: afterState.retrievability,
      status: afterState.status,
      due: afterState.due,
      lapses: afterState.lapses,
      reps: afterState.reps,
      elapsedDays: afterState.elapsedDays,
      scheduledDays: afterState.scheduledDays,
      lastReviewed: reviewTime,
      rating: rating,
      timeSpent: timeSpent,
      updatedAt: reviewTime
    };
    
    if (reviewsResult.data && reviewsResult.data.length > 0) {
      // 更新现有记录
      await db.collection('reviews')
        .doc(reviewsResult.data[0]._id)
        .update(reviewRecord);
    } else {
      // 创建新记录
      await db.collection('reviews').add({
        ...reviewRecord,
        createdAt: reviewTime
      });
    }
    
    return {
      success: true,
      data: {
        cardId: cardId,
        newState: afterState,
        nextDue: afterState.due
      }
    };
    
  } catch (error) {
    throw new Error(`提交复习失败: ${error.message}`);
  }
}

/**
 * 获取用户FSRS参数
 */
async function getUserFSRSParams(data) {
  const { userId, wordbookId } = data;
  
  try {
    // 尝试获取特定词书的参数
    let params = null;
    
    if (wordbookId) {
      const specificParams = await db.collection('user_fsrs_params')
        .where({
          userId: userId,
          wordbookId: wordbookId
        })
        .get();
      
      if (specificParams.data && specificParams.data.length > 0) {
        params = specificParams.data[0];
      }
    }
    
    // 如果没有特定参数，获取全局参数
    if (!params) {
      const globalParams = await db.collection('user_fsrs_params')
        .where({
          userId: userId,
          wordbookId: db.command.eq(null)
        })
        .get();
      
      if (globalParams.data && globalParams.data.length > 0) {
        params = globalParams.data[0];
      }
    }
    
    return {
      success: true,
      data: params || DEFAULT_FSRS_PARAMS
    };
    
  } catch (error) {
    throw new Error(`获取用户参数失败: ${error.message}`);
  }
}

/**
 * 计算下一个状态
 */
function calculateNextState(currentState, rating, params) {
  const { w, requestRetention, maximumInterval } = params;
  
  // 简化版FSRS算法实现
  const DECAY = -w[20] || -0.1542;
  const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
  
  let newState = { ...currentState };
  newState.reps = (newState.reps || 0) + 1;
  
  // 计算间隔时间
  const interval = currentState.due ? 
    Math.max(0, (new Date() - new Date(currentState.due)) / (24 * 60 * 60 * 1000)) : 0;
  
  // 根据评分更新状态
  if (rating === RATINGS.again) {
    // 遗忘
    newState.lapses = (newState.lapses || 0) + 1;
    newState.status = 'relearning';
    newState.difficulty = Math.min(10, Math.max(1, newState.difficulty + 0.8));
    newState.stability = Math.max(0.1, newState.stability * 0.2);
    newState.scheduledDays = 1;
  } else {
    // 记住
    if (newState.status === 'new') {
      newState.status = 'learning';
    } else if (newState.status === 'learning' || newState.status === 'relearning') {
      newState.status = 'review';
    }
    
    // 更新难度
    const difficultyChange = rating === RATINGS.hard ? 0.15 : 
                           rating === RATINGS.good ? 0 : -0.15;
    newState.difficulty = Math.min(10, Math.max(1, newState.difficulty + difficultyChange));
    
    // 更新稳定性
    const stabilityMultiplier = rating === RATINGS.hard ? 1.2 : 
                              rating === RATINGS.good ? 1.3 : 1.5;
    newState.stability = Math.max(0.1, newState.stability * stabilityMultiplier);
    
    // 计算下次复习间隔
    newState.scheduledDays = Math.min(
      maximumInterval,
      Math.max(1, Math.round(newState.stability / FACTOR * 
        (Math.pow(requestRetention, 1 / DECAY) - 1)))
    );
  }
  
  // 设置下次复习时间
  newState.due = new Date(Date.now() + newState.scheduledDays * 24 * 60 * 60 * 1000);
  newState.elapsedDays = interval;
  
  return newState;
}

/**
 * 获取学习统计
 */
async function getStudyStats(data) {
  const { userId, wordbookId, days = 30 } = data;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  try {
    // 获取最近的复习记录
    const reviews = await db.collection('reviews')
      .where({
        userId: userId,
        wordbookId: wordbookId,
        reviewTime: db.command.gte(startDate)
      })
      .orderBy('reviewTime', 'desc')
      .get();
    
    // 计算统计数据
    const stats = {
      totalReviews: reviews.data.length,
      accuracy: 0,
      averageTime: 0,
      streakDays: 0,
      ratingDistribution: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
      }
    };
    
    if (reviews.data.length > 0) {
      let correctCount = 0;
      let totalTime = 0;
      
      reviews.data.forEach(review => {
        if (review.rating > 1) correctCount++;
        totalTime += review.timeSpent || 0;
        
        const ratingKey = Object.keys(RATINGS).find(key => RATINGS[key] === review.rating);
        if (ratingKey) {
          stats.ratingDistribution[ratingKey]++;
        }
      });
      
      stats.accuracy = Math.round((correctCount / reviews.data.length) * 100);
      stats.averageTime = Math.round(totalTime / reviews.data.length);
    }
    
    return {
      success: true,
      data: stats
    };
    
  } catch (error) {
    throw new Error(`获取学习统计失败: ${error.message}`);
  }
}

/**
 * 优化参数（简化版）
 */
async function optimizeParameters(data) {
  const { userId, wordbookId } = data;
  
  try {
    // 获取用户的学习记录
    const reviews = await db.collection('reviews')
      .where({
        userId: userId,
        wordbookId: wordbookId
      })
      .get();
    
    if (reviews.data.length < 100) {
      return {
        success: false,
        error: '学习记录不足，需要至少100次复习记录才能优化参数'
      };
    }
    
    // 简化的参数优化逻辑
    // 实际应用中这里应该使用机器学习算法
    const optimizedParams = {
      ...DEFAULT_FSRS_PARAMS,
      reviewCount: reviews.data.length,
      optimized: true,
      optimizedAt: new Date()
    };
    
    // 保存优化后的参数
    await db.collection('user_fsrs_params').add({
      userId: userId,
      wordbookId: wordbookId,
      ...optimizedParams,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      data: optimizedParams
    };
    
  } catch (error) {
    throw new Error(`参数优化失败: ${error.message}`);
  }
}