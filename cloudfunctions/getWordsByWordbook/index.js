const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

exports.main = async (event, context) => {
  
  const db = app.database();
  const { wordbookId, limit = 50, offset = 0 } = event;
  
  if (!wordbookId) {
    return {
      success: false,
      error: '缺少词书ID参数',
      data: []
    };
  }
  
  try {
    // 添加性能监控
    const startTime = Date.now();
    
    // 优化查询：只获取必要字段，支持分页
    const wordsCollection = db.collection('words');
    let query = wordsCollection.where({
      wordbookId: wordbookId
    }).field({
      word: true,
      meaning: true,
      pos: true,
      phonetic: true,
      example: true,
      translation: true,
      audioUrl: true,
      _id: true
    });
    
    // 如果需要分页，添加skip和limit
    if (limit > 0) {
      query = query.skip(offset).limit(limit);
    }
    
    const wordsResult = await query.get();
    
    const endTime = Date.now();
    
    return {
      success: true,
      data: wordsResult.data || [],
      pagination: {
        total: wordsResult.data?.length || 0,
        limit,
        offset,
        hasMore: (wordsResult.data?.length || 0) === limit
      },
      performance: {
        queryTime: endTime - startTime
      }
    };
  } catch (error) {
    console.error('获取单词数据错误:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}; 