/**
 * 并发处理优化工具 - 实现异步执行和流式反馈
 * 减少语音助手处理的串行等待时间
 */

import { smartWarmup } from './functionKeepAlive';

// 处理状态常量
const PROCESSING_STAGES = {
  SPEECH_RECOGNITION: 'speech_recognition',
  AI_RESPONSE: 'ai_response', 
  TEXT_TO_SPEECH: 'text_to_speech'
};

// 阶段描述映射
const STAGE_DESCRIPTIONS = {
  [PROCESSING_STAGES.SPEECH_RECOGNITION]: '正在识别语音...',
  [PROCESSING_STAGES.AI_RESPONSE]: '正在思考回复...',
  [PROCESSING_STAGES.TEXT_TO_SPEECH]: '正在生成语音...'
};

/**
 * 并发语音助手处理器
 * 实现流式反馈和智能预热
 */
export class ConcurrentVoiceProcessor {
  constructor({
    onStageChange,
    onProgressUpdate,
    onPartialResult,
    onError,
    speechRecognizer,
    aiResponder,
    ttsGenerator
  }) {
    this.onStageChange = onStageChange;
    this.onProgressUpdate = onProgressUpdate;
    this.onPartialResult = onPartialResult;
    this.onError = onError;
    
    this.speechRecognizer = speechRecognizer;
    this.aiResponder = aiResponder;
    this.ttsGenerator = ttsGenerator;
    
    this.currentStage = null;
    this.isProcessing = false;
    this.abortController = null;
  }

  /**
   * 主要的并发处理方法
   * @param {Object} audioData - 音频数据
   * @returns {Promise} 处理结果
   */
  async processVoiceInput(audioData) {
    if (this.isProcessing) {
      console.warn('🚫 语音处理正在进行中，跳过此次请求');
      return;
    }

    this.isProcessing = true;
    this.abortController = new AbortController();
    
    try {
      console.log('🚀 开始并发语音处理流程');
      
      // 阶段1: 启动语音识别 + 预热后续服务
      const result = await this.executeWithConcurrentWarmup(audioData);
      
      console.log('✅ 并发语音处理完成');
      return result;
      
    } catch (error) {
      console.error('❌ 并发处理失败:', error);
      this.onError?.(error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.currentStage = null;
    }
  }

  /**
   * 执行并发处理 - 语音识别 + 智能预热
   */
  async executeWithConcurrentWarmup(audioData) {
    // 阶段1: 语音识别 + 并发预热
    this.setStage(PROCESSING_STAGES.SPEECH_RECOGNITION);
    
    const [speechResult] = await Promise.allSettled([
      this.executeSpeechRecognition(audioData),
      this.warmupDownstreamServices() // 并发预热
    ]);

    if (speechResult.status === 'rejected') {
      throw speechResult.reason;
    }

    const recognizedText = speechResult.value;
    console.log('🎯 语音识别完成，文本:', recognizedText.substring(0, 50) + '...');

    // 提供部分结果反馈
    this.onPartialResult?.({
      stage: PROCESSING_STAGES.SPEECH_RECOGNITION,
      result: recognizedText
    });

    // 阶段2: AI响应生成
    this.setStage(PROCESSING_STAGES.AI_RESPONSE);
    const aiResponse = await this.executeAIResponse(recognizedText);
    
    console.log('🤖 AI响应完成，长度:', aiResponse.length);

    // 提供AI响应结果
    this.onPartialResult?.({
      stage: PROCESSING_STAGES.AI_RESPONSE,
      result: aiResponse
    });

    // 阶段3: TTS生成（可以考虑与UI更新并发）
    this.setStage(PROCESSING_STAGES.TEXT_TO_SPEECH);
    await this.executeTTS(aiResponse);

    return {
      recognizedText,
      aiResponse,
      completed: true
    };
  }

  /**
   * 执行语音识别（带进度反馈）
   */
  async executeSpeechRecognition(audioData) {
    const startTime = Date.now();
    
    try {
      // 模拟进度更新
      const progressTimer = this.startProgressSimulation(0, 0.6, 3000); // 预计3秒完成60%
      
      const result = await this.speechRecognizer(audioData);
      
      clearInterval(progressTimer);
      this.onProgressUpdate?.(0.8); // 语音识别完成80%
      
      const duration = Date.now() - startTime;
      console.log(`⚡ 语音识别耗时: ${duration}ms`);
      
      return result;
    } catch (error) {
      console.error('❌ 语音识别失败:', error);
      throw error;
    }
  }

  /**
   * 执行AI响应生成（带进度反馈）
   */
  async executeAIResponse(text) {
    const startTime = Date.now();
    
    try {
      // AI响应通常比较快，模拟进度
      const progressTimer = this.startProgressSimulation(0.8, 0.95, 2000); // 2秒内从80%到95%
      
      const result = await this.aiResponder(text);
      
      clearInterval(progressTimer);
      this.onProgressUpdate?.(0.98);
      
      const duration = Date.now() - startTime;
      console.log(`🤖 AI响应耗时: ${duration}ms`);
      
      return result;
    } catch (error) {
      console.error('❌ AI响应失败:', error);
      throw error;
    }
  }

  /**
   * 执行TTS生成（带进度反馈）
   */
  async executeTTS(text) {
    const startTime = Date.now();
    
    try {
      this.onProgressUpdate?.(0.98);
      
      await this.ttsGenerator(text);
      
      this.onProgressUpdate?.(1.0);
      
      const duration = Date.now() - startTime;
      console.log(`🔊 TTS生成耗时: ${duration}ms`);
      
      // TTS完成后，等待一小段时间让用户看到100%，然后重置
      setTimeout(() => {
        this.onProgressUpdate?.(0);
        this.setStage(null);
      }, 1500);
      
    } catch (error) {
      console.error('❌ TTS生成失败:', error);
      throw error;
    }
  }

  /**
   * 并发预热后续服务
   */
  async warmupDownstreamServices() {
    console.log('🔥 开始并发预热后续服务...');
    
    const warmupPromises = [
      smartWarmup('ai-chat'),
      smartWarmup('text-to-speech')
    ];

    try {
      await Promise.allSettled(warmupPromises);
      console.log('✅ 后续服务预热完成');
    } catch (error) {
      console.warn('⚠️ 服务预热部分失败:', error);
      // 预热失败不影响主流程
    }
  }

  /**
   * 启动进度模拟（平滑的进度条效果）
   */
  startProgressSimulation(startProgress, endProgress, duration) {
    const startTime = Date.now();
    const progressDiff = endProgress - startProgress;
    
    return setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentProgress = startProgress + (progressDiff * progress);
      
      this.onProgressUpdate?.(currentProgress);
      
      if (progress >= 1) {
        clearInterval(this);
      }
    }, 100); // 每100ms更新一次
  }

  /**
   * 设置当前处理阶段
   */
  setStage(stage) {
    this.currentStage = stage;
    
    if (stage === null) {
      // 处理完成，重置状态
      console.log('✅ 处理完成，重置状态');
      this.onStageChange?.(null, '');
    } else {
      const description = STAGE_DESCRIPTIONS[stage] || '处理中...';
      console.log(`📍 进入阶段: ${stage} - ${description}`);
      this.onStageChange?.(stage, description);
    }
  }

  /**
   * 中断当前处理
   */
  abort() {
    if (this.abortController) {
      console.log('🛑 用户中断语音处理');
      this.abortController.abort();
      this.isProcessing = false;
    }
  }

  /**
   * 获取处理状态
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentStage: this.currentStage,
      currentDescription: STAGE_DESCRIPTIONS[this.currentStage]
    };
  }
}

/**
 * 流式反馈管理器
 * 管理UI状态更新和进度显示
 */
export class StreamingFeedbackManager {
  constructor(updateCallbacks = {}) {
    this.callbacks = updateCallbacks;
    this.currentProgress = 0;
    this.currentStage = null;
  }

  /**
   * 更新处理阶段
   */
  updateStage(stage, description) {
    this.currentStage = stage;
    
    if (stage === null) {
      // 处理完成，重置状态
      console.log('🎯 阶段重置: 处理完成');
      this.reset();
    } else {
      console.log(`🎯 阶段更新: ${description}`);
      this.callbacks.onStageUpdate?.(stage, description);
      
      // 根据阶段设置基础进度
      switch (stage) {
        case PROCESSING_STAGES.SPEECH_RECOGNITION:
          this.updateProgress(0.1);
          break;
        case PROCESSING_STAGES.AI_RESPONSE:
          this.updateProgress(0.6);
          break;
        case PROCESSING_STAGES.TEXT_TO_SPEECH:
          this.updateProgress(0.9);
          break;
      }
    }
  }

  /**
   * 更新进度条
   */
  updateProgress(progress) {
    this.currentProgress = Math.max(progress, this.currentProgress); // 进度只能向前
    this.callbacks.onProgressUpdate?.(this.currentProgress);
  }

  /**
   * 处理部分结果
   */
  handlePartialResult(partialData) {
    console.log(`📦 收到部分结果:`, partialData.stage);
    this.callbacks.onPartialResult?.(partialData);
  }

  /**
   * 处理错误
   */
  handleError(error) {
    console.error('💥 流式处理错误:', error);
    this.callbacks.onError?.(error);
    this.reset();
  }

  /**
   * 重置状态
   */
  reset() {
    console.log('🔄 重置进度状态');
    this.currentProgress = 0;
    this.currentStage = null;
    this.callbacks.onProgressUpdate?.(0);
    this.callbacks.onStageUpdate?.(null, '');
    this.callbacks.onComplete?.();
  }
}

/**
 * 创建优化的并发处理器实例
 */
export const createConcurrentProcessor = (config) => {
  const feedbackManager = new StreamingFeedbackManager(config.feedbackCallbacks || {});
  
  return new ConcurrentVoiceProcessor({
    onStageChange: (stage, description) => feedbackManager.updateStage(stage, description),
    onProgressUpdate: (progress) => feedbackManager.updateProgress(progress),
    onPartialResult: (data) => feedbackManager.handlePartialResult(data),
    onError: (error) => feedbackManager.handleError(error),
    
    speechRecognizer: config.speechRecognizer,
    aiResponder: config.aiResponder,
    ttsGenerator: config.ttsGenerator
  });
};

// 导出常量
export { PROCESSING_STAGES };

export default {
  ConcurrentVoiceProcessor,
  StreamingFeedbackManager,
  createConcurrentProcessor,
  PROCESSING_STAGES
};