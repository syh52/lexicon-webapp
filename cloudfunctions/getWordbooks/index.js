const tcb = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  // 初始化CloudBase
  const app = tcb.init({
    env: 'cloud1-7g7oatv381500c81'
  });
  
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