const OpenAI = require('openai');

/**
 * 使用 OpenAI SDK 进行语音合成
 * 支持完整的 TTS 参数配置
 */
async function callOpenAITTS(text, options = {}) {
  const { 
    voice = 'alloy', 
    speed = 1.0, 
    format = 'mp3',
    model = 'tts-1'
  } = options;

  // 检查环境变量配置
  const API_KEY = process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.GPTS_VIN_API_KEY;
  const API_BASE = process.env.API_BASE || process.env.OPENAI_API_BASE || 'https://www.chataiapi.com/v1';

  console.log('=== TTS API调用开始 (OpenAI SDK) ===');
  console.log('TTS配置检查:', {
    hasApiKey: !!API_KEY,
    apiKeyPrefix: API_KEY ? `${API_KEY.substring(0, 8)}...` : 'null',
    apiBase: API_BASE,
    model: model,
    voice: voice,
    speed: speed,
    format: format,
    textLength: text?.length || 0
  });

  if (!API_KEY) {
    const error = 'API密钥未配置，请在CloudBase控制台设置API_KEY环境变量';
    console.error('❌ TTS配置错误:', error);
    throw new Error(error);
  }

  try {
    // 初始化 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: API_KEY,
      baseURL: API_BASE
    });

    console.log('✅ OpenAI TTS SDK 客户端初始化成功');
    console.log('📤 发送语音合成请求...');

    // 调用 OpenAI TTS SDK
    const mp3 = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      response_format: format,
      speed: speed
    });

    console.log('✅ OpenAI TTS 请求成功，开始处理音频数据...');

    // 将响应转换为 Buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    console.log('=== OpenAI TTS SDK 响应信息 ===');
    console.log('音频格式:', format);
    console.log('音频大小:', buffer.length, 'bytes');
    console.log('语音类型:', voice);
    console.log('语速:', speed);
    console.log('Base64长度:', audioBase64.length);

    return {
      Audio: audioBase64,
      SessionId: Date.now().toString(),
      format: format,
      size: buffer.length,
      model: model,
      voice: voice,
      speed: speed
    };

  } catch (error) {
    console.error('❌ OpenAI TTS SDK调用异常:', {
      message: error.message,
      type: error.constructor.name,
      status: error.status,
      code: error.code
    });

    // 提供更友好的错误消息
    let friendlyError = error.message;
    if (error.status === 401) {
      friendlyError = 'TTS API密钥无效或已过期';
    } else if (error.status === 429) {
      friendlyError = 'TTS API请求频率过高，请稍后重试';
    } else if (error.status === 400) {
      friendlyError = 'TTS请求参数错误，请检查文本内容和语音参数';
    } else if (error.status === 500) {
      friendlyError = 'TTS服务暂时不可用，请稍后重试';
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      friendlyError = 'TTS网络连接失败，请检查网络设置';
    }

    console.log('=== TTS API调用结束（异常）===');
    throw new Error(`OpenAI TTS调用失败: ${friendlyError}`);
  }
}


exports.main = async (event, context) => {
  console.log('语音合成函数被调用');
  
  try {
    const { 
      text, 
      voice = 'alloy', 
      speed = 1.0, 
      format = 'mp3',
      model = 'tts-1'
    } = event;
    
    if (!text) {
      throw new Error('缺少文本内容');
    }

    // 检查文本长度（OpenAI TTS限制4096字符）
    if (text.length > 4096) {
      throw new Error('文本长度超出限制（最大4096字符）');
    }

    // 验证语音参数
    const supportedVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!supportedVoices.includes(voice)) {
      throw new Error(`不支持的语音类型: ${voice}，支持的语音: ${supportedVoices.join(', ')}`);
    }

    // 验证速度参数
    if (speed < 0.25 || speed > 4.0) {
      throw new Error('语速必须在0.25-4.0之间');
    }

    // 验证模型参数 - 根据New API支持的TTS模型更新
    const supportedModels = ['tts-1', 'tts-1-1106', 'tts-1-hd', 'tts-1-hd-1106', 'gpt-4o-mini-tts'];
    if (!supportedModels.includes(model)) {
      throw new Error(`不支持的模型: ${model}，支持的模型: ${supportedModels.join(', ')}`);
    }

    console.log('开始语音合成，配置:', { voice, speed, format, model });
    console.log('合成文本:', text.length > 50 ? text.substring(0, 50) + '...' : text);

    // 检查是否配置了API密钥 - 直接失败，不使用降级
    const API_KEY = process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.GPTS_VIN_API_KEY;
    if (!API_KEY) {
      throw new Error('❌ API密钥未配置！请在CloudBase控制台环境变量中设置 API_KEY。这是语音合成功能必需的配置。');
    }

    console.log('🔄 开始调用OpenAI TTS API...');
    
    // 直接调用API，失败就失败，不使用任何降级机制
    const result = await callOpenAITTS(text, { voice, speed, format, model });
    console.log('✅ OpenAI TTS成功，音频长度:', result.Audio ? result.Audio.length : 0);
    
    return {
      success: true,
      audio: result.Audio, // base64格式的音频数据
      sessionId: result.SessionId,
      method: 'openai-tts',
      format: result.format,
      size: result.size,
      model: result.model,
      voice: result.voice,
      speed: speed,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 语音合成失败:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack
    });
    
    // 提供详细的错误分析，帮助诊断问题
    let detailedError = error.message;
    let troubleshooting = [];
    
    if (error.message.includes('API密钥未配置')) {
      troubleshooting.push('在CloudBase控制台 → 云函数 → text-to-speech → 环境变量中设置 API_KEY');
      troubleshooting.push('确保API密钥有效且有足够余额');
    } else if (error.message.includes('network')) {
      troubleshooting.push('检查网络连接和API服务状态');
      troubleshooting.push('验证API Base URL是否正确');
    } else if (error.message.includes('401')) {
      troubleshooting.push('API密钥无效或已过期，请更新密钥');
    } else if (error.message.includes('429')) {
      troubleshooting.push('API请求频率过高，稍后重试');
    } else if (error.message.includes('500')) {
      troubleshooting.push('API服务暂时不可用，请稍后重试');
    }
    
    return {
      success: false,
      error: {
        message: `🔥 语音合成真实错误: ${detailedError}`,
        type: 'tts_api_error',
        code: 'processing_error',
        troubleshooting: troubleshooting,
        originalError: error.constructor.name
      },
      audio: '',
      sessionId: '',
      timestamp: new Date().toISOString()
    };
  }
};