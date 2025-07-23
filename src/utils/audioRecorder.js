/**
 * 音频录制工具类
 * 支持录制音频并转换为适合 OpenAI Whisper API 的格式
 */
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.onDataAvailable = null;
    this.onStop = null;
    this.onStart = null;
    this.onError = null;
  }

  /**
   * 请求麦克风权限并初始化录音
   */
  async initialize() {
    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper 推荐的采样率
          channelCount: 1,   // 单声道
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // 创建 MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus', // 优先使用 WebM/Opus
        audioBitsPerSecond: 64000
      };

      // 检查浏览器支持的格式
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else {
          options.mimeType = 'audio/wav';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // 设置事件监听器
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
        if (this.onDataAvailable) {
          this.onDataAvailable(event);
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('🎙️ 录音开始');
        this.isRecording = true;
        this.audioChunks = [];
        if (this.onStart) {
          this.onStart();
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('🛑 录音结束');
        this.isRecording = false;
        
        if (this.audioChunks.length > 0) {
          // 合并音频块
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder.mimeType 
          });
          
          console.log('📦 音频数据:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: this.audioChunks.length
          });

          // 转换为 Base64
          const base64Audio = await this.blobToBase64(audioBlob);
          
          if (this.onStop) {
            this.onStop({
              audioBlob,
              base64Audio,
              mimeType: this.mediaRecorder.mimeType,
              size: audioBlob.size
            });
          }
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ 录音错误:', event.error);
        this.isRecording = false;
        if (this.onError) {
          this.onError(event.error);
        }
      };

      return true;
    } catch (error) {
      console.error('❌ 初始化录音失败:', error);
      throw new Error(`录音初始化失败: ${error.message}`);
    }
  }

  /**
   * 开始录音
   */
  startRecording() {
    if (!this.mediaRecorder) {
      throw new Error('录音器未初始化，请先调用 initialize()');
    }

    if (this.isRecording) {
      console.warn('⚠️ 已在录音中');
      return;
    }

    try {
      this.mediaRecorder.start(1000); // 每秒触发一次 dataavailable 事件
    } catch (error) {
      console.error('❌ 启动录音失败:', error);
      throw new Error(`启动录音失败: ${error.message}`);
    }
  }

  /**
   * 停止录音
   */
  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) {
      console.warn('⚠️ 未在录音状态');
      return;
    }

    try {
      this.mediaRecorder.stop();
    } catch (error) {
      console.error('❌ 停止录音失败:', error);
      throw new Error(`停止录音失败: ${error.message}`);
    }
  }

  /**
   * 销毁录音器并释放资源
   */
  destroy() {
    if (this.mediaRecorder && this.isRecording) {
      this.stopRecording();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * 将 Blob 转换为 Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 移除 data URL 前缀，只保留 Base64 数据
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取音频格式信息
   */
  getAudioFormat() {
    if (!this.mediaRecorder) {
      return null;
    }

    const mimeType = this.mediaRecorder.mimeType;
    let format = 'webm';

    if (mimeType.includes('webm')) {
      format = 'webm';
    } else if (mimeType.includes('mp4')) {
      format = 'mp4';
    } else if (mimeType.includes('wav')) {
      format = 'wav';
    }

    return {
      mimeType,
      format,
      extension: format
    };
  }

  /**
   * 检查浏览器是否支持录音
   */
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }

  /**
   * 检查麦克风权限状态
   */
  static async checkMicrophonePermission() {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      return permission.state; // 'granted', 'denied', 'prompt'
    } catch (error) {
      console.log('无法检查麦克风权限:', error);
      return 'unknown';
    }
  }
}

export default AudioRecorder;