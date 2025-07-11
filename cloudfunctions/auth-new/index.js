const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 简单密码哈希函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'lexicon_salt').digest('hex');
}

function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

exports.main = async (event, context) => {
  const { action, email, password, displayName, userId } = event;
  
  try {
    switch (action) {
      case 'register':
        return await handleRegister(email, password, displayName);
      
      case 'login':
        return await handleLogin(email, password);
      
      case 'getUserInfo':
        return await getUserInfo(userId);
      
      case 'updateUserInfo':
        return await updateUserInfo(userId, event.userInfo);
      
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('Auth function error:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 用户注册
async function handleRegister(email, password, displayName) {
  if (!email || !password) {
    return {
      success: false,
      error: '邮箱和密码不能为空'
    };
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: '邮箱格式不正确'
    };
  }

  // 验证密码强度
  if (password.length < 6) {
    return {
      success: false,
      error: '密码至少需要6位'
    };
  }

  try {
    // 检查用户是否已存在
    const existingUser = await db.collection('users')
      .where({ email })
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        error: '用户已存在'
      };
    }

    // 对密码进行哈希处理
    const hashedPassword = hashPassword(password);

    // 创建新用户
    const userData = {
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      level: 1,
      totalWords: 0,
      studiedWords: 0,
      correctRate: 0,
      streakDays: 0,
      lastStudyDate: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };

    const result = await db.collection('users').add({
      data: userData
    });

    if (result._id) {
      return {
        success: true,
        data: {
          userId: result._id,
          email: userData.email,
          displayName: userData.displayName,
          level: userData.level,
          totalWords: userData.totalWords,
          studiedWords: userData.studiedWords,
          correctRate: userData.correctRate,
          streakDays: userData.streakDays,
          message: '注册成功'
        }
      };
    } else {
      return {
        success: false,
        error: '注册失败'
      };
    }
  } catch (error) {
    console.error('注册过程中发生错误:', error);
    return {
      success: false,
      error: '注册失败：' + error.message
    };
  }
}

// 用户登录
async function handleLogin(email, password) {
  if (!email || !password) {
    return {
      success: false,
      error: '邮箱和密码不能为空'
    };
  }

  try {
    // 查找用户
    const userResult = await db.collection('users')
      .where({ email })
      .get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '邮箱或密码错误'
      };
    }

    const user = userResult.data[0];

    // 验证密码
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: '邮箱或密码错误'
      };
    }

    // 更新最后登录时间
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          lastLoginAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

    return {
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        displayName: user.displayName,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate,
        message: '登录成功'
      }
    };
  } catch (error) {
    console.error('登录过程中发生错误:', error);
    return {
      success: false,
      error: '登录失败：' + error.message
    };
  }
}

// 获取用户信息
async function getUserInfo(userId) {
  if (!userId) {
    return {
      success: false,
      error: '用户ID不能为空'
    };
  }

  try {
    const userResult = await db.collection('users')
      .doc(userId)
      .get();

    if (!userResult.data) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userResult.data;

    return {
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        displayName: user.displayName,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate
      }
    };
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return {
      success: false,
      error: '获取用户信息失败：' + error.message
    };
  }
}

// 更新用户信息
async function updateUserInfo(userId, userInfo) {
  if (!userId) {
    return {
      success: false,
      error: '用户ID不能为空'
    };
  }

  const updateData = {
    ...userInfo,
    updatedAt: db.serverDate()
  };

  // 移除敏感字段
  delete updateData.password;
  delete updateData._id;

  const result = await db.collection('users')
    .doc(userId)
    .update({
      data: updateData
    });

  if (result.stats.updated) {
    return {
      success: true,
      data: { updated: result.stats.updated }
    };
  } else {
    return {
      success: false,
      error: '更新失败'
    };
  }
}