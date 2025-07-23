const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

// WebSocket连接管理
const connections = new Map();

class VoiceSession {
  constructor(connectionId, context) {
    this.connectionId = connectionId;
    this.context = context;
    this.audioBuffer = [];
    this.conversationHistory = [];
    this.isProcessing = false;
    this.userId = null;
    this.sessionId = Date.now().toString();
    
    console.log(`新的语音会话创建: ${this.sessionId}`);
  }

  async handleMessage(event) {
    try {
      if (event.body) {
        // 处理二进制音频数据
        const audioData = Buffer.from(event.body, 'base64');
        await this.handleAudioData(audioData);
      } else if (event.requestContext && event.requestContext.messageId) {
        // 处理文本消息
        const message = JSON.parse(event.body || '{}');
        await this.handleTextMessage(message);
      }
    } catch (error) {
      console.error('消息处理错误:', error);
      await this.sendMessage({
        type: 'error',
        content: '消息处理失败: ' + error.message
      });
    }
  }

  async handleAudioData(audioBuffer) {
    if (audioBuffer.length < 8) {
      console.warn('音频数据包太小，忽略');
      return;
    }

    try {
      // 解析音频包头部 (8字节)
      const timestamp = audioBuffer.readUInt32BE(0);
      const flags = audioBuffer.readUInt32BE(4);
      const isTTSPlaying = Boolean(flags & 1);
      const pcmData = audioBuffer.slice(8);

      // 累积音频数据
      this.audioBuffer.push(pcmData);
      
      // 计算累积的音频长度
      const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      
      // 当累积了足够的音频数据时进行处理 (~1.5秒的音频数据)
      if (totalLength >= 48000 && !this.isProcessing) { // 24kHz * 2字节 * 1.5秒
        this.isProcessing = true;
        
        // 合并音频缓冲区
        const combinedBuffer = Buffer.concat(this.audioBuffer);
        this.audioBuffer = []; // 清空缓冲区
        
        // 异步处理音频，不阻塞主线程
        this.processAudioBuffer(combinedBuffer).finally(() => {
          this.isProcessing = false;
        });
      }
    } catch (error) {
      console.error('音频数据处理错误:', error);
      this.isProcessing = false;
    }
  }

  async processAudioBuffer(combinedBuffer) {
    try {
      console.log(`开始处理音频数据，长度: ${combinedBuffer.length} 字节`);
      
      // 1. 语音识别
      const transcription = await this.speechToText(combinedBuffer);
      
      if (!transcription || transcription.trim().length === 0) {
        console.log('语音识别结果为空，跳过处理');
        return;
      }

      console.log('用户语音识别结果:', transcription);

      // 发送用户输入确认
      await this.sendMessage({
        type: 'user_input',
        content: transcription
      });

      // 2. AI处理和回复生成
      const aiResponse = await this.generateAIResponse(transcription);
      
      if (!aiResponse || !aiResponse.text) {
        console.error('AI回复生成失败');
        return;
      }

      console.log('AI回复:', aiResponse.text);

      // 发送AI文本回复
      await this.sendMessage({
        type: 'ai_response',
        content: aiResponse.text,
        analysis: aiResponse.analysis
      });

      // 3. 语音合成
      const audioResponse = await this.textToSpeech(aiResponse.text);
      
      if (audioResponse) {
        await this.sendAudioResponse(audioResponse);
      }

      // 4. 保存对话记录
      await this.saveConversation(transcription, aiResponse);

    } catch (error) {
      console.error('音频处理流程错误:', error);
      await this.sendMessage({
        type: 'error',
        content: '音频处理失败，请重试'
      });
    }
  }

  async handleTextMessage(message) {
    console.log('收到文本消息:', message);
    
    switch (message.type) {
      case 'user_info':
        this.userId = message.userId;
        await this.sendMessage({
          type: 'welcome',
          content: 'Hello! I\'m your English speaking assistant. Let\'s practice English together! 你好！我是你的英语口语助手，我们一起练习英语吧！'
        });
        break;
        
      case 'clear_history':
        this.conversationHistory = [];
        await this.sendMessage({
          type: 'history_cleared',
          content: 'Conversation history cleared. Let\'s start fresh!'
        });
        break;
        
      case 'ping':
        await this.sendMessage({ type: 'pong', content: 'pong' });
        break;
        
      default:
        console.warn('未知消息类型:', message.type);
    }
  }

  async speechToText(audioBuffer) {
    try {
      // 调用腾讯云语音识别
      // 注意：这里需要将PCM数据转换为腾讯云ASR支持的格式
      const base64Audio = audioBuffer.toString('base64');
      
      const result = await app.callFunction({
        name: 'speech-recognition',
        data: {
          audio: base64Audio,
          language: 'en-US', // 英语识别
          format: 'pcm',
          sampleRate: 24000,
          channels: 1
        }
      });

      if (result.result && result.result.success) {
        return result.result.text;
      } else {
        console.error('语音识别失败:', result.result);
        return null;
      }
    } catch (error) {
      console.error('语音识别API调用错误:', error);
      return null;
    }
  }

  async generateAIResponse(userInput) {
    try {
      // 构建针对英语学习的对话上下文
      const systemPrompt = `You are an experienced English conversation tutor helping Chinese students practice spoken English. 

Your responsibilities:
1. Correct pronunciation and grammar mistakes gently
2. Suggest better word choices and expressions
3. Keep conversations natural and engaging
4. Provide encouraging feedback
5. Adapt to the student's English level

Guidelines:
- Keep responses concise (under 50 words for voice)
- Use simple, clear language
- Include one learning tip per response when appropriate  
- Encourage continued conversation
- Be patient and supportive

The student just said: "${userInput}"

Respond naturally and helpfully.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.slice(-6), // 保留最近3轮对话上下文
        { role: 'user', content: userInput }
      ];

      // 调用AI对话API
      const result = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: messages,
          model: 'gpt-4o-mini', // 使用快速且便宜的模型
          temperature: 0.7,
          maxTokens: 150 // 限制回复长度，适合语音对话
        }
      });

      if (result.result && result.result.success) {
        const aiText = result.result.response;
        
        // 分析用户英语表达质量
        const analysis = await this.analyzeUserInput(userInput, aiText);
        
        return {
          text: aiText,
          analysis: analysis
        };
      } else {
        console.error('AI对话生成失败:', result.result);
        return {
          text: "I'm sorry, I didn't catch that. Could you please repeat?",
          analysis: null
        };
      }
    } catch (error) {
      console.error('AI响应生成错误:', error);
      return {
        text: "I'm having trouble understanding. Let's try again!",
        analysis: null
      };
    }
  }

  async analyzeUserInput(userInput, aiResponse) {
    // 基于用户输入和AI响应进行简单的语言质量分析
    const analysis = {
      grammarScore: this.calculateGrammarScore(userInput),
      pronunciationTips: this.extractPronunciationTips(aiResponse),
      vocabularyLevel: this.assessVocabularyLevel(userInput),
      suggestions: this.extractSuggestions(aiResponse)
    };
    
    return analysis;
  }

  calculateGrammarScore(text) {
    // 简单的语法评分逻辑
    let score = 8.0; // 基础分
    
    // 检查基本语法规则
    if (!text.match(/^[A-Z]/)) score -= 0.5; // 首字母大写
    if (!text.match(/[.!?]$/)) score -= 0.5; // 标点符号
    if (text.split(' ').length < 3) score -= 1.0; // 句子长度
    
    return Math.max(5.0, Math.min(10.0, score));
  }

  extractPronunciationTips(aiResponse) {
    // 从AI响应中提取发音相关建议
    const tips = [];
    if (aiResponse.includes('pronounce') || aiResponse.includes('pronunciation')) {
      tips.push('Focus on clear pronunciation');
    }
    return tips;
  }

  assessVocabularyLevel(text) {
    const wordCount = text.split(' ').length;
    if (wordCount < 5) return 'beginner';
    if (wordCount < 15) return 'intermediate';
    return 'advanced';
  }

  extractSuggestions(aiResponse) {
    // 从AI响应中提取改进建议
    const suggestions = [];
    if (aiResponse.includes('try saying') || aiResponse.includes('you could say')) {
      suggestions.push('Consider alternative expressions');
    }
    return suggestions;
  }

  async textToSpeech(text) {
    try {
      // 调用OpenAI格式的TTS API（通过text-to-speech云函数）
      const result = await app.callFunction({
        name: 'text-to-speech',
        data: {
          text: text,
          voice: 'nova', // 使用英语女声（适合对话）
          speed: 1.0,
          format: 'mp3',
          model: 'tts-1' // 使用标准TTS模型
        }
      });

      if (result.result && result.result.success) {
        return Buffer.from(result.result.audio, 'base64');
      } else {
        console.error('语音合成失败:', result.result);
        return null;
      }
    } catch (error) {
      console.error('语音合成API调用错误:', error);
      return null;
    }
  }

  async sendAudioResponse(audioBuffer) {
    if (!audioBuffer || audioBuffer.length === 0) return;

    try {
      // 分块发送音频数据，每块4KB
      const chunkSize = 4096;
      const totalChunks = Math.ceil(audioBuffer.length / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);
        const base64Chunk = chunk.toString('base64');
        
        await this.sendMessage({
          type: 'audio_chunk',
          content: base64Chunk,
          chunkIndex: i,
          totalChunks: totalChunks
        });
      }
      
      // 发送音频结束标志
      await this.sendMessage({
        type: 'audio_end',
        content: ''
      });
      
      console.log(`音频发送完成，共 ${totalChunks} 个块`);
    } catch (error) {
      console.error('音频发送错误:', error);
    }
  }

  async saveConversation(userInput, aiResponse) {
    try {
      const conversationRecord = {
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous',
        userInput: userInput,
        aiResponse: aiResponse.text,
        analysis: aiResponse.analysis,
        timestamp: new Date(),
        createdAt: new Date()
      };

      // 保存到数据库
      await db.collection('voice_conversations').add(conversationRecord);
      
      // 更新内存中的对话历史
      this.conversationHistory.push(
        { role: 'user', content: userInput },
        { role: 'assistant', content: aiResponse.text }
      );
      
      // 保持对话历史不超过20条记录
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
      
      console.log('对话记录保存成功');
    } catch (error) {
      console.error('保存对话记录错误:', error);
    }
  }

  async sendMessage(message) {
    try {
      // 在CloudBase函数型Agent中，通过context发送WebSocket消息
      if (this.context && this.context.websocket) {
        await this.context.websocket.send(JSON.stringify(message));
        return true;
      } else {
        console.error('WebSocket连接不可用');
        return false;
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      return false;
    }
  }

  cleanup() {
    console.log(`语音会话清理: ${this.sessionId}`);
    this.audioBuffer = [];
    this.conversationHistory = [];
  }
}

// 主处理函数
exports.main = async (event, context) => {
  console.log('语音助手云函数被调用');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // WebSocket连接处理
    if (event.requestContext && event.requestContext.routeKey) {
      const connectionId = event.requestContext.connectionId;
      const routeKey = event.requestContext.routeKey;
      
      console.log(`WebSocket ${routeKey}:`, connectionId);
      
      switch (routeKey) {
        case '$connect':
          // 新连接建立
          const session = new VoiceSession(connectionId, context);
          connections.set(connectionId, session);
          
          console.log(`WebSocket连接建立: ${connectionId}`);
          return { statusCode: 200 };
          
        case '$disconnect':
          // 连接断开
          const disconnectSession = connections.get(connectionId);
          if (disconnectSession) {
            disconnectSession.cleanup();
            connections.delete(connectionId);
          }
          
          console.log(`WebSocket连接断开: ${connectionId}`);
          return { statusCode: 200 };
          
        case '$default':
          // 消息处理
          const messageSession = connections.get(connectionId);
          if (messageSession) {
            await messageSession.handleMessage(event);
          } else {
            console.error(`找不到连接会话: ${connectionId}`);
          }
          
          return { statusCode: 200 };
          
        default:
          console.warn(`未知的路由键: ${routeKey}`);
          return { statusCode: 400, body: 'Unknown route' };
      }
    }

    // HTTP请求处理
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        message: 'Voice Assistant Service is running',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('语音助手函数执行错误:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};