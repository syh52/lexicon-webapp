const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  console.log('Hello 云函数被调用了！');
  console.log('传入参数:', event);
  
  return {
    success: true,
    message: 'Hello from CloudBase Function!',
    data: {
      timestamp: new Date().toISOString(),
      event: event,
      wxContext: cloud.getWXContext()
    }
  };
};