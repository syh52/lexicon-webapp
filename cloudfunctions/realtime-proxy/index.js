/**
 * OpenAI Realtime API 代理云函数
 * 处理临时密钥获取和API请求代理
 */

const cloudbase = require('@cloudbase/node-sdk');
const fetch = require('node-fetch');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

// API配置
const API_CONFIG = {
  baseURL: 'https://www.chataiapi.com/v1',
  // 修复端点路径，去掉尾部的/sessions
  realtimeURL: 'https://www.chataiapi.com/v1/realtime',
  apiKey: process.env.OPENAI_API_KEY || 'sk-MVwM0Y77CDZbTMT0cFoDe5WSZuYZk1G64dMWE6hpBitqgkgT',
  defaultModel: 'gpt-4o-realtime-preview',
  defaultVoice: 'nova'
};

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  console.log('Realtime代理云函数被调用:', JSON.stringify(event, null, 2));

  try {
    const { action, data = {} } = event;

    switch (action) {
      case 'get_key':
        return await getEphemeralKey(data);
      
      case 'proxy_request':
        return await proxyRealtimeRequest(data);
      
      case 'get_session_info':
        return await getSessionInfo(data);
      
      case 'test_connection':
        return await testConnection(data);
      
      case 'test_websocket':
        return await testWebSocketConnection(data);
      
      case 'diagnose_realtime':
        return await diagnoseRealtimeSupport(data);
      
      case 'chat_completion':
        return await chatCompletion(event); // 直接传递整个event对象
      
      default:
        return {
          success: false,
          error: `未知的操作类型: ${action}`
        };
    }

  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * 获取Realtime API临时密钥
 */
async function getEphemeralKey(params = {}) {
  try {
    console.log('🔑 Getting ephemeral key for Realtime API...');

    const requestBody = {
      model: params.model || API_CONFIG.defaultModel
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    // 尝试不同的可能的端点路径
    const possibleEndpoints = [
      'https://www.chataiapi.com/v1/realtime/sessions',
      'https://www.chataiapi.com/v1/realtime',
      'https://www.chataiapi.com/v1/sessions',
      'https://www.chataiapi.com/v1/chat/realtime',
      'https://www.chataiapi.com/v1/chat/sessions'
    ];
    
    let response;
    let successEndpoint = null;
    
    for (const endpoint of possibleEndpoints) {
      console.log(`🌐 Trying endpoint: ${endpoint}`);
      
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CloudBase-Function/1.0'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log(`📥 Response status for ${endpoint}:`, response.status);
        
        if (response.status !== 404) {
          successEndpoint = endpoint;
          break;
        }
        
      } catch (error) {
        console.log(`❌ Error with ${endpoint}:`, error.message);
        continue;
      }
    }
    
    if (!successEndpoint) {
      throw new Error('None of the realtime endpoints are supported by the API');
    }
    
    console.log(`✅ Using successful endpoint: ${successEndpoint}`);

    console.log('📥 API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Realtime API Error - Status:', response.status);
      console.error('❌ Realtime API Error - Content:', errorText);
      
      throw new Error(`Failed to get ephemeral key: ${response.status} - ${errorText}`);
    }

    // 解析响应数据
    let data;
    try {
      data = await response.json();
      console.log('✅ API Response Data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      throw new Error('Invalid JSON response from API');
    }

    // 验证响应格式
    if (!data.client_secret || !data.client_secret.value) {
      console.error('❌ Invalid response format - missing client_secret');
      throw new Error('Invalid response format from API');
    }

    // 保存会话信息到数据库（可选）
    try {
      await db.collection('realtime_sessions').add({
        sessionId: data.id,
        clientSecret: data.client_secret.value,
        expiresAt: new Date(data.expires_at * 1000),
        model: data.model || requestBody.model,
        createdAt: new Date(),
        status: 'created'
      });
      console.log('💾 Session info saved to database');
    } catch (dbError) {
      console.warn('⚠️ Failed to save session info to database:', dbError.message);
      // 不影响主流程，继续返回结果
    }

    // 返回标准格式，匹配OpenAI API规范
    return {
      success: true,
      key: data.client_secret.value,
      sessionId: data.id,
      expiresAt: data.expires_at,
      model: data.model || requestBody.model,
      // 保持原始API响应的完整结构供调试使用
      _rawResponse: data
    };

  } catch (error) {
    console.error('❌ Failed to get ephemeral key:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 代理Realtime API请求
 */
async function proxyRealtimeRequest(params) {
  try {
    const { endpoint, method = 'GET', headers = {}, body } = params;

    if (!endpoint) {
      throw new Error('缺少endpoint参数');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.baseURL}${endpoint}`;
    
    const requestOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CloudBase-Function/1.0',
        ...headers
      }
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log('代理请求:', {
      url,
      method,
      headers: requestOptions.headers
    });

    const response = await fetch(url, requestOptions);
    
    console.log('代理响应状态:', response.status);

    const responseData = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      error: response.ok ? null : `请求失败: ${response.status}`
    };

  } catch (error) {
    console.error('代理请求失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取会话信息
 */
async function getSessionInfo(params) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      throw new Error('缺少sessionId参数');
    }

    // 从数据库查询会话信息
    const result = await db.collection('realtime_sessions')
      .where({
        sessionId: sessionId
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        error: '会话不存在'
      };
    }

    const session = result.data[0];
    
    // 检查会话是否过期
    const now = new Date();
    const isExpired = now > session.expiresAt;

    return {
      success: true,
      session: {
        id: session.sessionId,
        model: session.model,
        voice: session.voice,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        status: session.status,
        isExpired
      }
    };

  } catch (error) {
    console.error('获取会话信息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试API连接
 */
async function testConnection(params = {}) {
  try {
    console.log('测试API连接...');

    // 测试基础API连接
    const response = await fetch(`${API_CONFIG.baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'User-Agent': 'CloudBase-Function/1.0'
      }
    });

    const isConnected = response.ok;
    const status = response.status;

    let availableModels = [];
    if (isConnected) {
      try {
        const data = await response.json();
        availableModels = data.data
          ?.filter(model => model.id.includes('realtime'))
          ?.map(model => model.id) || [];
      } catch (parseError) {
        console.warn('解析模型列表失败:', parseError.message);
      }
    }

    // 获取系统信息
    const systemInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      region: process.env.TENCENTCLOUD_REGION || 'unknown',
      runtime: process.version
    };

    return {
      success: true,
      connection: {
        status: isConnected ? 'connected' : 'failed',
        httpStatus: status,
        baseURL: API_CONFIG.baseURL,
        hasApiKey: !!API_CONFIG.apiKey,
        availableModels,
        systemInfo
      }
    };

  } catch (error) {
    console.error('测试连接失败:', error);
    return {
      success: false,
      error: error.message,
      connection: {
        status: 'error',
        baseURL: API_CONFIG.baseURL,
        hasApiKey: !!API_CONFIG.apiKey
      }
    };
  }
}

/**
 * 工具函数：验证API密钥格式
 */
function validateApiKey(apiKey) {
  if (!apiKey) {
    return false;
  }
  
  // 检查是否以sk-开头，且长度合理
  return apiKey.startsWith('sk-') && apiKey.length > 20;
}

/**
 * 聊天补全功能
 */
async function chatCompletion(params) {
  try {
    console.log('📤 chatCompletion received params:', JSON.stringify(params, null, 2));
    const { messages, model = API_CONFIG.defaultModel, temperature = 0.7, max_tokens = 500 } = params;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('缺少messages参数');
    }

    console.log('💬 Processing chat completion...');
    console.log('📤 Messages:', JSON.stringify(messages, null, 2));

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens,
      stream: false
    };

    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CloudBase-Function/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Chat API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Chat API Error - Status:', response.status);
      console.error('❌ Chat API Error - Content:', errorText);
      
      throw new Error(`Chat completion failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Chat API Response:', JSON.stringify(data, null, 2));

    // 提取回复内容
    const content = data.choices?.[0]?.message?.content || '抱歉，我无法生成回复。';

    return {
      success: true,
      content,
      usage: data.usage,
      model: data.model,
      _rawResponse: data
    };

  } catch (error) {
    console.error('❌ Chat completion failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 诊断Realtime API支持情况
 */
async function diagnoseRealtimeSupport(params = {}) {
  try {
    console.log('🔍 开始诊断Realtime API支持情况...');
    
    const diagnosis = {
      baseUrl: API_CONFIG.baseURL,
      apiKey: API_CONFIG.apiKey ? `${API_CONFIG.apiKey.substring(0, 7)}...` : 'missing',
      tests: []
    };

    // 1. 测试基础连接
    console.log('🧪 测试1: 基础API连接');
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
          'User-Agent': 'CloudBase-Function/1.0'
        }
      });
      
      diagnosis.tests.push({
        name: '基础API连接',
        status: response.ok ? 'PASS' : 'FAIL',
        httpStatus: response.status,
        details: response.ok ? '连接正常' : `HTTP ${response.status}`
      });
    } catch (error) {
      diagnosis.tests.push({
        name: '基础API连接',
        status: 'ERROR',
        details: error.message
      });
    }

    // 2. 测试realtime sessions端点
    console.log('🧪 测试2: Realtime Sessions端点');
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/realtime/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CloudBase-Function/1.0'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview'
        })
      });
      
      const responseText = await response.text();
      diagnosis.tests.push({
        name: 'Realtime Sessions端点',
        status: response.ok ? 'PASS' : 'FAIL',
        httpStatus: response.status,
        details: response.ok ? 'sessions端点可用' : `${response.status}: ${responseText}`
      });
    } catch (error) {
      diagnosis.tests.push({
        name: 'Realtime Sessions端点',
        status: 'ERROR',
        details: error.message
      });
    }

    // 3. 测试不同的realtime模型 - 使用用户提供的正确模型名称
    console.log('🧪 测试3: Realtime模型可用性');
    const realtimeModels = [
      'gpt-4o-realtime-preview',
      'gpt-4o-realtime-preview-2024-10-01',
      'gpt-4o-realtime-preview-2025-06-03',
      'gpt-4o-realtime-preview-2024-12-17',
      'gpt-4o-mini-realtime-preview-2024-12-17',
      'gpt-4o-mini-realtime-preview'
    ];

    for (const model of realtimeModels) {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CloudBase-Function/1.0'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
          })
        });

        const responseData = await response.json();
        diagnosis.tests.push({
          name: `模型 ${model}`,
          status: response.ok ? 'AVAILABLE' : 'UNAVAILABLE',
          httpStatus: response.status,
          details: response.ok ? '模型可用' : (responseData.error?.message || `HTTP ${response.status}`)
        });
      } catch (error) {
        diagnosis.tests.push({
          name: `模型 ${model}`,
          status: 'ERROR',
          details: error.message
        });
      }
    }

    // 4. 检查API文档兼容性
    diagnosis.compatibility = {
      service: 'chataiapi.com',
      documented_for: 'newapi.pro',
      expected_issues: [
        'WebSocket realtime端点可能不支持',
        'realtime模型可能在当前分组不可用',
        'API格式可能有差异'
      ]
    };

    return {
      success: true,
      diagnosis
    };

  } catch (error) {
    console.error('诊断过程出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试WebSocket连接支持
 */
async function testWebSocketConnection(params = {}) {
  try {
    console.log('测试WebSocket连接支持...');

    // 测试不同的WebSocket端点
    const endpoints = [
      'wss://www.chataiapi.com/v1/realtime',
      'wss://www.chataiapi.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17'
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      console.log(`测试端点: ${endpoint}`);
      
      try {
        // 使用标准的WebSocket测试（在Node.js环境中）
        const testResult = {
          endpoint,
          status: 'testing',
          error: null
        };
        
        // 由于云函数环境限制，我们只能做基础的URL格式检查
        if (endpoint.startsWith('wss://') && endpoint.includes('chataiapi.com')) {
          testResult.status = 'format_valid';
        } else {
          testResult.status = 'format_invalid';
        }
        
        results.push(testResult);
        
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      success: true,
      websocket_support: {
        tested_endpoints: results,
        recommendation: 'WebSocket需要在浏览器环境中测试',
        alternative: '可以考虑使用HTTP polling或Server-Sent Events'
      }
    };

  } catch (error) {
    console.error('测试WebSocket连接失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 工具函数：清理过期会话
 */
async function cleanupExpiredSessions() {
  try {
    const now = new Date();
    
    const result = await db.collection('realtime_sessions')
      .where({
        expiresAt: db.command.lt(now)
      })
      .remove();

    console.log(`清理了 ${result.deleted} 个过期会话`);
    return result.deleted;

  } catch (error) {
    console.error('清理过期会话失败:', error);
    return 0;
  }
}

// 定期清理过期会话（每次函数调用时有10%概率执行）
if (Math.random() < 0.1) {
  cleanupExpiredSessions().catch(console.error);
}