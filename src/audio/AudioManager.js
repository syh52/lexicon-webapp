/**
 * 音频管理器
 * 负责管理AudioWorklet、音频流和WebSocket连接
 */

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.audioWorkletNode = null;
    this.mediaStream = null;
    this.mediaStreamSource = null;
    
    // WebSocket连接
    this.websocket = null;
    this.websocketUrl = '';
    
    // 状态管理
    this.isInitialized = false;
    this.isRecording = false;
    this.isPlaying = false;
    
    // 音频配置
    this.config = {
      sampleRate: 24000,
      bufferSize: 1024,
      channels: 1,
      silenceThreshold: 0.01
    };
    
    // 事件回调
    this.onVolumeLevel = null;
    this.onAudioData = null;
    this.onRecordingState = null;
    this.onError = null;
    
    console.log('AudioManager created');
  }
  
  /**
   * 初始化音频系统
   */
  async initialize() {
    try {
      console.log('Initializing AudioManager...');
      
      // 创建AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });
      
      console.log('AudioContext created:', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
      
      // 加载AudioWorklet处理器
      await this.audioContext.audioWorklet.addModule('/audioProcessor.js');
      console.log('AudioWorklet module loaded');
      
      // 创建AudioWorkletNode
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: this.config.channels,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers'
      });
      
      // 监听AudioWorklet消息
      this.audioWorkletNode.port.onmessage = this.handleAudioWorkletMessage.bind(this);
      
      // 获取用户媒体权限
      await this.requestMediaAccess();
      
      // 连接音频节点
      this.mediaStreamSource.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);
      
      // 配置AudioWorklet
      this.audioWorkletNode.port.postMessage({
        type: 'configure',
        data: this.config
      });
      
      this.isInitialized = true;
      console.log('AudioManager initialized successfully');
      
      return true;
    } catch (error) {
      console.error('AudioManager initialization failed:', error);
      if (this.onError) {
        this.onError('音频系统初始化失败: ' + error.message);
      }
      return false;
    }
  }
  
  /**
   * 请求媒体访问权限
   */
  async requestMediaAccess() {
    try {
      console.log('Requesting media access...');
      
      const constraints = {
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream obtained:', {
        tracks: this.mediaStream.getTracks().length,
        audioTracks: this.mediaStream.getAudioTracks().length
      });
      
      // 创建MediaStreamSource
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      console.log('MediaStreamSource created');
      
      return true;
    } catch (error) {
      throw new Error(`媒体访问被拒绝: ${error.message}`);
    }
  }
  
  /**
   * 连接WebSocket
   */
  async connectWebSocket(url) {
    try {
      console.log('Connecting to WebSocket:', url);
      this.websocketUrl = url;
      
      this.websocket = new WebSocket(url);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setTimeout(() => {
          if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
            this.connectWebSocket(this.websocketUrl);
          }
        }, 1000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.onError) {
          this.onError('WebSocket连接失败');
        }
      };
      
      // 等待连接建立
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket连接超时'));
        }, 5000);
        
        this.websocket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        this.websocket.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket连接失败'));
        };
      });
      
      return true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      if (this.onError) {
        this.onError('WebSocket连接失败: ' + error.message);
      }
      return false;
    }
  }
  
  /**
   * 开始录音
   */
  async startRecording() {
    if (!this.isInitialized) {
      throw new Error('AudioManager未初始化');
    }
    
    if (this.isRecording) {
      return;
    }
    
    try {
      // 恢复AudioContext（用户手势要求）
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // 开始录音
      this.audioWorkletNode.port.postMessage({
        type: 'start-recording'
      });
      
      this.isRecording = true;
      console.log('Recording started');
      
      if (this.onRecordingState) {
        this.onRecordingState(true);
      }
    } catch (error) {
      console.error('Start recording failed:', error);
      if (this.onError) {
        this.onError('开始录音失败: ' + error.message);
      }
      throw error;
    }
  }
  
  /**
   * 停止录音
   */
  stopRecording() {
    if (!this.isRecording) {
      return;
    }
    
    this.audioWorkletNode.port.postMessage({
      type: 'stop-recording'
    });
    
    this.isRecording = false;
    console.log('Recording stopped');
    
    if (this.onRecordingState) {
      this.onRecordingState(false);
    }
  }
  
  /**
   * 播放音频数据
   */
  async playAudio(audioData) {
    try {
      console.log('Playing audio data, length:', audioData.length);
      
      // 将base64音频数据转换为AudioBuffer
      const audioBuffer = await this.decodeAudioData(audioData);
      
      // 创建AudioBufferSourceNode
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // 播放音频
      source.start(0);
      
      console.log('Audio playback started');
      
      return new Promise((resolve) => {
        source.onended = () => {
          console.log('Audio playback ended');
          resolve();
        };
      });
    } catch (error) {
      console.error('Audio playback failed:', error);
      if (this.onError) {
        this.onError('音频播放失败: ' + error.message);
      }
      throw error;
    }
  }
  
  /**
   * 解码音频数据
   */
  async decodeAudioData(base64Data) {
    try {
      // 将base64转换为ArrayBuffer
      const binaryString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      throw new Error(`音频解码失败: ${error.message}`);
    }
  }
  
  /**
   * 处理AudioWorklet消息
   */
  handleAudioWorkletMessage(event) {
    const { type, data, volume, isSilent, sampleCount, duration, timestamp } = event.data;
    
    switch (type) {
      case 'volume-level':
        if (this.onVolumeLevel) {
          this.onVolumeLevel(volume, isSilent);
        }
        break;
        
      case 'audio-data':
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          // 发送音频数据到WebSocket
          this.websocket.send(data);
          console.log(`Audio data sent via WebSocket: ${sampleCount} samples, ${duration.toFixed(2)}s`);
        }
        
        if (this.onAudioData) {
          this.onAudioData(data, sampleCount, duration);
        }
        break;
        
      case 'recording-started':
        console.log('AudioWorklet recording started');
        break;
        
      case 'recording-stopped':
        console.log('AudioWorklet recording stopped');
        break;
        
      default:
        console.log('Unhandled AudioWorklet message:', type);
    }
  }
  
  /**
   * 处理WebSocket消息
   */
  handleWebSocketMessage(event) {
    try {
      // 处理二进制音频数据
      if (event.data instanceof ArrayBuffer) {
        console.log('Received binary audio data:', event.data.byteLength);
        
        // 解析音频数据（跳过8字节头部）
        const audioData = event.data.slice(8);
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
        
        // 播放接收到的音频
        this.playAudio(base64Audio).catch(error => {
          console.error('Play received audio failed:', error);
        });
        
        return;
      }
      
      // 处理JSON消息
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);
      
      switch (message.type) {
        case 'transcription':
          console.log('Transcription:', message.text);
          break;
          
        case 'ai_response':
          console.log('AI Response:', message.text);
          if (message.audio) {
            this.playAudio(message.audio).catch(error => {
              console.error('Play AI audio failed:', error);
            });
          }
          break;
          
        case 'error':
          console.error('Server error:', message.error);
          if (this.onError) {
            this.onError('服务器错误: ' + message.error);
          }
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Handle WebSocket message failed:', error);
    }
  }
  
  /**
   * 销毁音频管理器
   */
  destroy() {
    console.log('Destroying AudioManager...');
    
    // 停止录音
    if (this.isRecording) {
      this.stopRecording();
    }
    
    // 关闭WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // 断开音频节点
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    
    // 关闭AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
    console.log('AudioManager destroyed');
  }
}

export default AudioManager;