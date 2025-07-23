const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

exports.main = async (event, context) => {
  
  const db = app.database();
  
  try {
    // 获取词书列表
    const wordbooksCollection = db.collection('wordbooks');
    const wordbooksResult = await wordbooksCollection.get();
    
    // 获取单词数据
    const wordsCollection = db.collection('words');
    const wordsResult = await wordsCollection.get();
    
    return {
      success: true,
      data: {
        wordbooks: wordbooksResult.data || [],
        words: wordsResult.data || []
      }
    };
  } catch (error) {
    console.error('数据库查询错误:', error);
    return {
      success: false,
      error: error.message,
      data: {
        wordbooks: [],
        words: []
      }
    };
  }
}; 