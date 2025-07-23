const https = require('https');

// API配置
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.GPTS_VIN_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://www.chataiapi.com/v1';

/**
 * 使用 OpenAI Whisper API 进行语音识别
 * 支持New API文档中的所有参数
 */
async function callOpenAIWhisper(audioData, options = {}) {
  const { 
    language = 'en', 
    format = 'wav',
    prompt = '',
    response_format = 'json',
    temperature = 0
  } = options;

  try {
    // 直接使用API Base URL，不添加额外的/v1  
    const { URL } = require('url');
    const url = new URL(`${OPENAI_API_BASE}/audio/transcriptions`);

    // 创建 multipart/form-data 请求
    const boundary = '----formdata-' + Math.random().toString(36);
    
    // 构建 multipart 数据
    const audioBuffer = Buffer.from(audioData, 'base64');
    const formData = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="audio.${format}"\r\n`,
      `Content-Type: audio/${format}\r\n\r\n`,
    ].join('');
    
    let formDataEnd = [
      `\r\n--${boundary}\r\n`,
      `Content-Disposition: form-data; name="model"\r\n\r\n`,
      `whisper-1\r\n`
    ];
    
    // 添加语言参数（如果不是自动检测）
    if (language && language !== 'auto') {
      formDataEnd.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="language"\r\n\r\n`,
        `${language}\r\n`
      );
    }
    
    // 添加提示词参数（如果提供）
    if (prompt) {
      formDataEnd.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="prompt"\r\n\r\n`,
        `${prompt}\r\n`
      );
    }
    
    // 添加响应格式参数
    formDataEnd.push(
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="response_format"\r\n\r\n`,
      `${response_format}\r\n`
    );
    
    // 添加温度参数
    if (temperature > 0) {
      formDataEnd.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="temperature"\r\n\r\n`,
        `${temperature}\r\n`
      );
    }
    
    formDataEnd.push(`--${boundary}--\r\n`);
    const formDataEndStr = formDataEnd.join('');

    const formDataBuffer = Buffer.concat([
      Buffer.from(formData, 'utf8'),
      audioBuffer,
      Buffer.from(formDataEndStr, 'utf8')
    ]);

    const options_req = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'User-Agent': 'CloudBase-Function/1.0.0',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options_req, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              // 处理HTTP错误状态码
              let errorMsg = `HTTP ${res.statusCode}`;
              try {
                const errorData = JSON.parse(data);
                if (errorData.error) {
                  errorMsg = errorData.error.message || errorData.error.code || errorMsg;
                }
              } catch (e) {
                // 忽略JSON解析错误，使用默认错误消息
              }
              reject(new Error(errorMsg));
              return;
            }
            
            const result = JSON.parse(data);
            if (result.text) {
              resolve({ 
                text: result.text, 
                duration: result.duration || 0,
                language: result.language || language,
                segments: result.segments || []
              });
            } else if (result.error) {
              reject(new Error(result.error.message || result.error));
            } else {
              reject(new Error('API返回格式错误'));
            }
          } catch (error) {
            console.log('解析失败，原始响应:', data);
            reject(new Error('API响应解析失败: ' + error.message));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(formDataBuffer);
      req.end();
    });

  } catch (error) {
    throw new Error(`OpenAI Whisper调用失败: ${error.message}`);
  }
}

/**
 * 生成模拟识别结果（当API密钥未配置时使用）
 */
function generateMockRecognition(audioData) {
  const mockTexts = [
    "Hello, this is a test recognition result.",
    "How are you today?",
    "This is a sample speech recognition output.",
    "Testing the speech recognition functionality.",
    "Mock audio recognition is working perfectly."
  ];
  
  const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
  
  return {
    text: randomText,
    duration: Math.floor(Math.random() * 5000 + 1000) // 1-6秒
  };
}

exports.main = async (event, context) => {
  console.log('语音识别函数被调用');
  
  try {
    const { 
      audio, 
      audioData, 
      language = 'en', 
      format = 'wav',
      prompt = '',
      response_format = 'json',
      temperature = 0
    } = event;

    // 获取音频数据（支持多种参数名）
    const audioInput = audio || audioData;
    
    if (!audioInput) {
      throw new Error('缺少音频数据');
    }

    console.log('开始语音识别，配置:', { 
      language, 
      format, 
      prompt: prompt ? `"${prompt.substring(0, 50)}..."` : '无',
      response_format,
      temperature
    });
    console.log('音频数据长度:', audioInput.length);

    let result;

    // 检查是否配置了API密钥
    if (OPENAI_API_KEY) {
      try {
        result = await callOpenAIWhisper(audioInput, { 
          language, 
          format, 
          prompt, 
          response_format, 
          temperature 
        });
        console.log('OpenAI Whisper成功:', result.text);
        
        return {
          success: true,
          text: result.text,
          duration: result.duration,
          language: result.language,
          segments: result.segments,
          method: 'openai-whisper',
          model: 'whisper-1',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('OpenAI Whisper调用失败:', error.message);
        // 如果API调用失败，使用模拟识别结果
        console.log('使用模拟识别作为备选方案');
        result = generateMockRecognition(audioInput);
        
        return {
          success: true,
          text: result.text,
          duration: result.duration,
          method: 'mock-fallback',
          note: `OpenAI Whisper调用失败(${error.message})，使用模拟识别结果`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      console.log('未配置OpenAI API密钥，使用模拟识别');
      result = generateMockRecognition(audioInput);
      
      return {
        success: true,
        text: result.text,
        duration: result.duration,
        method: 'mock',
        note: '当前使用模拟识别结果，请在CloudBase控制台配置OPENAI_API_KEY以启用真实语音识别',
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    console.error('语音识别处理错误:', error);
    return {
      success: false,
      error: {
        message: error.message,
        type: 'invalid_request_error',
        code: 'processing_error'
      },
      text: '',
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }
};