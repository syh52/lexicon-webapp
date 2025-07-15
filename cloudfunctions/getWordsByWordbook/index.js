const tcb = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  // 初始化CloudBase
  const app = tcb.init({
    env: 'cloud1-7g7oatv381500c81'
  });
  
  const db = app.database();
  const { wordbookId } = event;
  
  if (!wordbookId) {
    return {
      success: false,
      error: '缺少词书ID参数',
      data: []
    };
  }
  
  try {
    // 获取特定词书的单词数据
    const wordsCollection = db.collection('words');
    const wordsResult = await wordsCollection.where({
      wordbookId: wordbookId
    }).get();
    
    return {
      success: true,
      data: wordsResult.data || []
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