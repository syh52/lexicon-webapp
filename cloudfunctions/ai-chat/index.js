/**
 * AI对话云函数 - 使用 OpenAI SDK 重构版本
 */

const OpenAI = require('openai');

/**
 * 使用 OpenAI SDK 调用 AI API
 */
async function callExternalAI(messages, options = {}) {
  const {
    model = process.env.DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = parseFloat(process.env.TEMPERATURE) || 0.7,
    maxTokens = parseInt(process.env.MAX_TOKENS) || 200
  } = options;

  // 检查环境变量（在CloudBase控制台配置）
  const API_KEY = process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.GPTS_VIN_API_KEY;
  const API_BASE = process.env.API_BASE || process.env.OPENAI_API_BASE || 'https://www.chataiapi.com/v1';

  console.log('=== AI API调用开始 (OpenAI SDK) ===');
  console.log('API配置检查:', {
    hasApiKey: !!API_KEY,
    apiKeyPrefix: API_KEY ? `${API_KEY.substring(0, 8)}...` : 'null',
    apiBase: API_BASE,
    model: model,
    temperature: temperature,
    maxTokens: maxTokens,
    messagesCount: messages.length
  });

  // 打印消息内容（用于调试）
  console.log('输入消息:', JSON.stringify(messages, null, 2));

  if (!API_KEY) {
    const error = 'API密钥未配置，请在CloudBase控制台设置API_KEY环境变量';
    console.error('❌ 配置错误:', error);
    throw new Error(error);
  }

  try {
    // 初始化 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: API_KEY,
      baseURL: API_BASE
    });

    console.log('✅ OpenAI SDK 客户端初始化成功');
    console.log('📤 发送聊天补全请求...');

    // 调用 OpenAI SDK
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false
    });

    console.log('=== OpenAI SDK 响应信息 ===');
    console.log('响应ID:', completion.id);
    console.log('使用模型:', completion.model);
    console.log('Token使用情况:', completion.usage);
    console.log('选择数量:', completion.choices?.length || 0);

    if (completion.choices && completion.choices.length > 0) {
      const content = completion.choices[0].message.content;
      console.log('✅ 成功获取AI回复:', content?.substring(0, 100) + (content?.length > 100 ? '...' : ''));
      return content;
    } else {
      const errorMsg = 'OpenAI SDK返回格式异常: 没有有效的choices';
      console.error('❌ 响应格式错误:', errorMsg);
      throw new Error(errorMsg);
    }

  } catch (error) {
    console.error('❌ OpenAI SDK调用异常:', {
      message: error.message,
      type: error.constructor.name,
      status: error.status,
      code: error.code
    });
    
    // 提供更友好的错误消息
    let friendlyError = error.message;
    if (error.status === 401) {
      friendlyError = 'API密钥无效或已过期';
    } else if (error.status === 429) {
      friendlyError = 'API请求频率过高，请稍后重试';
    } else if (error.status === 500) {
      friendlyError = 'AI服务暂时不可用，请稍后重试';
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      friendlyError = '网络连接失败，请检查网络设置';
    }
    
    console.log('=== AI API调用结束（异常）===');
    throw new Error(friendlyError);
  }
}

/**
 * 构建英语学习提示词
 */
function buildEnglishLearningPrompt(messages, userLevel = 'intermediate', scenario = 'general') {
  const levelMap = {
    beginner: '初学者',
    intermediate: '中级学习者', 
    advanced: '高级学习者'
  };

  const scenarioMap = {
    general: '日常对话',
    business: '商务英语',
    academic: '学术英语',
    travel: '旅行英语'
  };

  const systemPrompt = `你是一个专业的英语学习AI助手。用户是${levelMap[userLevel] || '中级学习者'}，当前练习场景是${scenarioMap[scenario] || '日常对话'}。

请遵循以下规则：
1. 用英语回复，语言难度适合用户水平
2. 如果用户英语有错误，温和地指出并提供正确表达
3. 鼓励用户多说多练，提供有用的语言建议
4. 保持对话自然流畅，就像真实的英语老师
5. 回复简洁明了，一般不超过50个单词

现在开始对话：`;

  return [
    { role: 'system', content: systemPrompt },
    ...messages
  ];
}

exports.main = async (event, context) => {
  const startTime = Date.now();
  console.log('🚀 === AI Chat函数开始执行 ===');
  console.log('调用参数:', {
    messagesCount: event.messages?.length || 0,
    model: event.model || 'default',
    userLevel: event.userLevel || 'intermediate',
    scenario: event.scenario || 'general',
    hasTemperature: !!event.temperature,
    hasMaxTokens: !!event.maxTokens,
    timestamp: new Date().toISOString()
  });
  
  try {
    const {
      messages = [],
      userLevel = 'intermediate',
      scenario = 'general',
      model,
      temperature,
      maxTokens
    } = event;

    // 参数验证
    if (!messages || messages.length === 0) {
      const error = '请提供对话消息';
      console.error('❌ 参数验证失败:', error);
      throw new Error(error);
    }

    if (!Array.isArray(messages)) {
      const error = '消息必须是数组格式';
      console.error('❌ 参数格式错误:', error);
      throw new Error(error);
    }

    console.log('✅ 参数验证通过');
    console.log('消息详情:', messages.map((msg, idx) => ({
      index: idx,
      role: msg.role,
      contentLength: msg.content?.length || 0,
      contentPreview: msg.content?.substring(0, 100) + (msg.content?.length > 100 ? '...' : '')
    })));

    // 构建英语学习提示词
    console.log('🔄 构建英语学习提示词...');
    const enhancedMessages = buildEnglishLearningPrompt(messages, userLevel, scenario);
    console.log('✅ 提示词构建完成, 总消息数:', enhancedMessages.length);
    
    // 直接调用外部AI API
    console.log('🔄 调用外部AI API...');
    const aiResponse = await callExternalAI(enhancedMessages, {
      model,
      temperature, 
      maxTokens
    });

    const executionTime = Date.now() - startTime;
    console.log('✅ AI API调用成功');
    console.log('📊 执行统计:', {
      执行时间: `${executionTime}ms`,
      响应长度: aiResponse?.length || 0,
      响应预览: aiResponse?.substring(0, 200) + (aiResponse?.length > 200 ? '...' : ''),
    });

    const result = {
      success: true,
      response: aiResponse,
      userLevel,
      scenario,
      model: model || 'default',
      executionTime,
      timestamp: new Date().toISOString(),
      method: 'External AI'
    };

    console.log('🎉 === AI Chat函数执行成功 ===');
    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('💥 === AI Chat函数执行失败 ===');
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      executionTime,
      timestamp: new Date().toISOString(),
      // 在开发环境包含更多调试信息
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    };
  }
};