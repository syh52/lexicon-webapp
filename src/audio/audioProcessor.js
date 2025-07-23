/**
 * AudioWorklet音频处理器
 * 负责实时音频数据的采集、缓冲和传输
 * 基于RealtimeVoiceChat的音频处理架构
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // 音频配置
    this.sampleRate = 24000; // 24kHz采样率
    this.bufferSize = 1024;  // 每次处理的采样数
    this.channels = 1;       // 单声道
    
    // 音频缓冲
    this.audioBuffer = [];
    this.targetBufferSize = this.sampleRate * 0.5; // 500ms的音频缓冲
    
    // 状态管理
    this.isRecording = false;
    this.isPlaying = false;
    
    // 音量检测
    this.volumeLevel = 0;
    this.silenceThreshold = 0.01;
    this.silenceCount = 0;
    this.maxSilenceFrames = 10; // 连续静音帧数阈值
    
    // 消息处理
    this.port.onmessage = this.handleMessage.bind(this);
    
    console.log('AudioProcessor initialized:', {
      sampleRate: this.sampleRate,
      bufferSize: this.bufferSize,
      targetBufferSize: this.targetBufferSize
    });
  }
  
  /**
   * 处理来自主线程的消息
   */
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'start-recording':
        this.startRecording();
        break;
        
      case 'stop-recording':
        this.stopRecording();
        break;
        
      case 'start-playing':
        this.startPlaying();
        break;
        
      case 'stop-playing':
        this.stopPlaying();
        break;
        
      case 'play-audio':
        this.playAudioData(data.audioData);
        break;
        
      case 'configure':
        this.configure(data);
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  }
  
  /**
   * 开始录音
   */
  startRecording() {
    this.isRecording = true;
    this.audioBuffer = [];
    this.silenceCount = 0;
    
    this.port.postMessage({
      type: 'recording-started',
      timestamp: currentTime
    });
    
    console.log('Recording started');
  }
  
  /**
   * 停止录音
   */
  stopRecording() {
    this.isRecording = false;
    
    // 发送剩余的音频数据
    if (this.audioBuffer.length > 0) {
      this.flushAudioBuffer();
    }
    
    this.port.postMessage({
      type: 'recording-stopped',
      timestamp: currentTime
    });
    
    console.log('Recording stopped');
  }
  
  /**
   * 开始播放
   */
  startPlaying() {
    this.isPlaying = true;
    console.log('Playing started');
  }
  
  /**
   * 停止播放
   */
  stopPlaying() {
    this.isPlaying = false;
    console.log('Playing stopped');
  }
  
  /**
   * 播放音频数据
   */
  playAudioData(audioData) {
    // 这里实现音频播放逻辑
    // 实际的音频播放会通过主线程的AudioBuffer来处理
    this.port.postMessage({
      type: 'play-audio-request',
      audioData: audioData,
      timestamp: currentTime
    });
  }
  
  /**
   * 配置音频处理参数
   */
  configure(config) {
    if (config.sampleRate) this.sampleRate = config.sampleRate;
    if (config.bufferSize) this.bufferSize = config.bufferSize;
    if (config.silenceThreshold) this.silenceThreshold = config.silenceThreshold;
    
    console.log('AudioProcessor configured:', config);
  }
  
  /**
   * 主要的音频处理循环
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0) {
      return true;
    }
    
    // 处理录音输入
    if (this.isRecording && input[0]) {
      this.processInput(input[0]);
    }
    
    // 处理播放输出（如果需要）
    if (this.isPlaying && output[0]) {
      this.processOutput(output[0]);
    }
    
    return true;
  }
  
  /**
   * 处理录音输入数据
   */
  processInput(inputData) {
    // 计算音量级别
    this.volumeLevel = this.calculateVolume(inputData);
    
    // 检测静音
    const isSilent = this.volumeLevel < this.silenceThreshold;
    
    if (isSilent) {
      this.silenceCount++;
    } else {
      this.silenceCount = 0;
    }
    
    // 发送音量级别到主线程
    this.port.postMessage({
      type: 'volume-level',
      volume: this.volumeLevel,
      isSilent: isSilent,
      timestamp: currentTime
    });
    
    // 添加到音频缓冲区
    this.audioBuffer.push(...Array.from(inputData));
    
    // 如果缓冲区达到目标大小或检测到静音，发送数据
    if (this.audioBuffer.length >= this.targetBufferSize || 
        (isSilent && this.silenceCount >= this.maxSilenceFrames && this.audioBuffer.length > 0)) {
      this.flushAudioBuffer();
    }
  }
  
  /**
   * 处理播放输出数据
   */
  processOutput(outputData) {
    // 如果有待播放的音频数据，这里进行处理
    // 实际实现中，播放通常通过AudioBuffer在主线程处理
    outputData.fill(0);
  }
  
  /**
   * 计算音频的音量级别（RMS）
   */
  calculateVolume(samples) {
    let sum = 0;
    
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    
    return Math.sqrt(sum / samples.length);
  }
  
  /**
   * 发送音频缓冲区数据到主线程
   */
  flushAudioBuffer() {
    if (this.audioBuffer.length === 0) {
      return;
    }
    
    // 转换为PCM格式并创建带头部的数据包
    const pcmData = this.convertToPCM(this.audioBuffer);
    const timestamp = Date.now();
    
    // 创建8字节头部：4字节时间戳 + 4字节标志
    const header = new ArrayBuffer(8);
    const headerView = new DataView(header);
    headerView.setUint32(0, timestamp & 0xFFFFFFFF, true); // 时间戳（低32位）
    headerView.setUint32(4, 0x01, true); // 标志：0x01表示音频数据
    
    // 合并头部和PCM数据
    const totalLength = header.byteLength + pcmData.byteLength;
    const combinedBuffer = new ArrayBuffer(totalLength);
    const combinedView = new Uint8Array(combinedBuffer);
    
    combinedView.set(new Uint8Array(header), 0);
    combinedView.set(new Uint8Array(pcmData), header.byteLength);
    
    // 发送到主线程
    this.port.postMessage({
      type: 'audio-data',
      data: combinedBuffer,
      timestamp: timestamp,
      sampleCount: this.audioBuffer.length,
      duration: this.audioBuffer.length / this.sampleRate
    });
    
    console.log(`Audio data sent: ${this.audioBuffer.length} samples, ${(this.audioBuffer.length / this.sampleRate * 1000).toFixed(0)}ms`);
    
    // 清空缓冲区
    this.audioBuffer = [];
  }
  
  /**
   * 将Float32Array转换为PCM格式
   */
  convertToPCM(floatSamples) {
    const buffer = new ArrayBuffer(floatSamples.length * 2); // 16位PCM
    const view = new DataView(buffer);
    
    for (let i = 0; i < floatSamples.length; i++) {
      // 将浮点数转换为16位有符号整数
      const sample = Math.max(-1, Math.min(1, floatSamples[i]));
      const pcmSample = Math.round(sample * 32767);
      view.setInt16(i * 2, pcmSample, true);
    }
    
    return buffer;
  }
}

// 注册音频处理器
registerProcessor('audio-processor', AudioProcessor);