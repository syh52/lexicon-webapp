import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Square, Settings, Sparkles, MessageCircle, Brain, Headphones, RotateCcw } from 'lucide-react';
import { getApp, ensureLogin, getCachedLoginState } from '../utils/cloudbase';
import { ttsConfig } from '../config/voiceConfig';
import AudioRecorder from '../utils/audioRecorder';
import RealtimeVoiceAssistant from '../components/RealtimeVoiceAssistant';

const VoiceAssistantPage = () => {
  // 语音助手模式选择：'classic' 或 'realtime'
  const [assistantMode, setAssistantMode] = useState('realtime');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [currentVoice, setCurrentVoice] = useState('alloy');
  const [authState, setAuthState] = useState('disconnected');

  // AI模型选项（与设置页面保持一致）
  const AI_MODELS = [
    { value: 'o3-mini', label: 'O3-Mini', description: '快速响应，适合日常对话' },
    { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o Latest', description: '最新版本，功能全面' },
    { value: 'gpt-4.1', label: 'GPT-4.1', description: '高级推理，深度学习' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: '轻量版本，快速响应' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '经济实用，性能优秀' }
  ];

  // AI助手声音选项（与设置页面保持一致）
  const VOICE_OPTIONS = [
    { value: 'alloy', label: 'Alloy', description: '中性，清晰' },
    { value: 'echo', label: 'Echo', description: '男性，温和' },
    { value: 'fable', label: 'Fable', description: '英式，优雅' },
    { value: 'onyx', label: 'Onyx', description: '男性，深沉' },
    { value: 'nova', label: 'Nova', description: '女性，活泼' },
    { value: 'shimmer', label: 'Shimmer', description: '女性，温柔' }
  ];
  const [userLevel, setUserLevel] = useState('intermediate');
  const [scenario, setScenario] = useState('general');
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [microphonePermission, setMicrophonePermission] = useState('unknown');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [replayingMessageId, setReplayingMessageId] = useState(null);

  const audioRecorderRef = useRef(null);

  // 加载用户设置
  useEffect(() => {
    const savedModel = localStorage.getItem('ai-model') || 'gpt-4o-mini';
    const savedVoice = localStorage.getItem('ai-voice') || 'alloy';
    setCurrentModel(savedModel);
    setCurrentVoice(savedVoice);
  }, []);

  // 监听localStorage变化，实时更新设置
  useEffect(() => {
    const handleStorageChange = () => {
      const savedModel = localStorage.getItem('ai-model') || 'gpt-4o-mini';
      const savedVoice = localStorage.getItem('ai-voice') || 'alloy';
      setCurrentModel(savedModel);
      setCurrentVoice(savedVoice);
    };

    // 监听storage事件（跨标签页）
    window.addEventListener('storage', handleStorageChange);
    
    // 监听自定义事件（同一标签页内的变化）
    window.addEventListener('settingsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleStorageChange);
    };
  }, []);

  // 初始化CloudBase认证（使用统一的单例实例）
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔄 VoiceAssistant: 初始化认证...');
        setAuthState('connecting');
        
        // 确保登录状态
        const loginState = await ensureLogin();
        
        if (loginState && loginState.isLoggedIn) {
          console.log('✅ VoiceAssistant: 认证成功');
          setAuthState('connected');
          setError(''); // 清除之前的错误
        } else {
          console.log('❌ VoiceAssistant: 认证失败');
          setAuthState('error');
          setError('CloudBase认证失败，AI功能可能无法正常使用');
        }
      } catch (error) {
        console.error('❌ VoiceAssistant: 认证异常:', error);
        setAuthState('error');
        setError(`CloudBase连接失败：${error.message}`);
      }
    };
    
    initAuth();
  }, []);

  // 检查麦克风权限
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' });
          setMicrophonePermission(permission.state);
          
          // 监听权限变化
          permission.onchange = () => {
            setMicrophonePermission(permission.state);
          };
        } else {
          setMicrophonePermission('unknown');
        }
      } catch (error) {
        console.log('无法检查麦克风权限:', error);
        setMicrophonePermission('unknown');
      }
    };

    checkMicrophonePermission();
  }, []);

  // 请求麦克风权限
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 权限获取成功
      setMicrophonePermission('granted');
      setError('');
      
      // 关闭流
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('麦克风权限请求失败:', error);
      setMicrophonePermission('denied');
      
      let errorMessage = '麦克风权限被拒绝';
      if (error.name === 'NotAllowedError') {
        errorMessage = '麦克风权限被拒绝。请在浏览器设置中允许麦克风权限。';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备。请检查麦克风是否已连接。';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持麦克风功能。';
      }
      
      setError(errorMessage + '\n💡 提示：点击地址栏左侧的锁图标 → 麦克风 → 允许');
      return false;
    }
  };

  // 初始化音频录制器
  useEffect(() => {
    const initAudioRecorder = async () => {
      try {
        // 检查浏览器支持
        if (!AudioRecorder.isSupported()) {
          setIsSupported(false);
          setError('您的浏览器不支持音频录制，请使用Chrome浏览器');
          return;
        }

        // 创建录音器实例
        const recorder = new AudioRecorder();
        
        // 设置事件处理器
        recorder.onStart = () => {
          console.log('🎙️ 开始录音');
          setIsRecording(true);
          setStatus('recording');
          setCurrentTranscript('正在录音中...');
          setError('');
        };

        recorder.onStop = async (audioData) => {
          console.log('🛑 录音结束，开始语音识别');
          setIsRecording(false);
          setStatus(isConnected ? 'connected' : 'disconnected');
          setCurrentTranscript('正在识别语音...');
          setIsProcessingAudio(true);

          try {
            await handleSpeechRecognition(audioData);
          } catch (error) {
            console.error('❌ 语音识别失败:', error);
            setError(`语音识别失败: ${error.message}`);
          } finally {
            setIsProcessingAudio(false);
            setCurrentTranscript('');
          }
        };

        recorder.onError = (error) => {
          console.error('❌ 录音错误:', error);
          setIsRecording(false);
          setStatus(isConnected ? 'connected' : 'disconnected');
          setCurrentTranscript('');
          setError(`录音失败: ${error.message}`);
        };

        // 尝试初始化录音器
        await recorder.initialize();
        audioRecorderRef.current = recorder;
        setIsSupported(true);
        
        console.log('✅ 音频录制器初始化成功');

      } catch (error) {
        console.error('❌ 音频录制器初始化失败:', error);
        setIsSupported(false);
        setError(`音频录制器初始化失败: ${error.message}`);
      }
    };

    initAudioRecorder();

    // 清理函数
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.destroy();
      }
    };
  }, []);

  // 处理语音识别 - 调用 OpenAI Whisper API
  const handleSpeechRecognition = async (audioData) => {
    console.log('🔄 开始调用 OpenAI Whisper API 进行语音识别');
    
    try {
      // 确保已认证
      await ensureLogin();
      const app = getApp();

      // 获取音频格式信息
      const formatInfo = audioRecorderRef.current?.getAudioFormat();
      console.log('📦 音频数据信息:', {
        size: audioData.size,
        type: audioData.mimeType,
        format: formatInfo?.format || 'webm'
      });

      // 调用 speech-recognition 云函数（增加重试机制）
      let result;
      let lastError;
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`🔄 尝试第 ${attempt} 次调用语音识别...`);
          
          result = await app.callFunction({
            name: 'speech-recognition',
            data: {
              audioData: audioData.base64Audio,
              language: 'auto', // 自动检测语言，支持中英混合
              format: formatInfo?.format || 'webm',
              response_format: 'json',
              temperature: 0
            },
            timeout: 45000 // 45秒超时
          });
          
          // 如果成功，跳出重试循环
          break;
          
        } catch (attemptError) {
          console.error(`❌ 第 ${attempt} 次尝试失败:`, attemptError);
          lastError = attemptError;
          
          // 如果不是最后一次尝试，等待后重试
          if (attempt < 2) {
            console.log('⏳ 等待 2 秒后重试...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // 如果所有尝试都失败了
      if (!result) {
        const errorMessage = lastError?.message || 'unknown error';
        console.error('💥 所有重试尝试都失败了:', errorMessage);
        
        // 根据错误类型提供更具体的错误信息
        if (errorMessage.includes('timeout')) {
          throw new Error('语音识别服务响应超时，请检查网络连接或稍后重试');
        } else if (errorMessage.includes('network')) {
          throw new Error('网络连接错误，请检查网络设置');
        } else {
          throw new Error(`语音识别服务暂时不可用: ${errorMessage}`);
        }
      }

      console.log('📥 语音识别结果:', {
        success: result.result?.success,
        method: result.result?.method,
        textLength: result.result?.text?.length || 0,
        hasError: !!result.result?.error
      });

      if (result.result && result.result.success && result.result.text) {
        const recognizedText = result.result.text.trim();
        console.log('✅ 识别成功:', recognizedText);

        // 添加用户消息到对话记录
        const userMessage = {
          id: Date.now(),
          type: 'user',
          content: recognizedText,
          timestamp: new Date().toLocaleTimeString(),
          method: result.result.method,
          duration: result.result.duration
        };
        setMessages(prev => [...prev, userMessage]);

        // 调用AI服务生成回复
        await handleAIResponse(recognizedText);

      } else {
        // 处理云函数返回的错误
        const errorInfo = result.result?.error;
        let errorMsg = '语音识别失败';
        
        if (typeof errorInfo === 'object' && errorInfo.message) {
          errorMsg = errorInfo.message;
        } else if (typeof errorInfo === 'string') {
          errorMsg = errorInfo;
        }
        
        console.error('❌ 语音识别失败:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('💥 语音识别异常:', error);
      
      // 更友好的错误提示
      const friendlyMessage = error.message.includes('network') 
        ? '网络连接异常，请检查网络设置后重试'
        : error.message;
        
      throw new Error(friendlyMessage);
    }
  };

  // 调用AI服务生成回复
  const handleAIResponse = async (userInput) => {
    setIsAIProcessing(true);
    
    try {
      console.log('🔄 VoiceAssistant: 开始调用AI服务:', {
        userInput: userInput.substring(0, 100) + (userInput.length > 100 ? '...' : ''),
        userLevel,
        scenario,
        model: currentModel,
        authState
      });

      // 确保已认证
      await ensureLogin();
      const app = getApp();

      // 调用ai-chat云函数（增加超时设置）
      const result = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: [
            {
              role: 'user',
              content: userInput
            }
          ],
          userLevel: userLevel,
          scenario: scenario,
          model: currentModel
        },
        timeout: 60000 // 60秒超时，适应高级模型的响应时间
      });

      console.log('📥 云函数调用结果:', {
        success: result.result?.success,
        hasResponse: !!result.result?.response,
        method: result.result?.method,
        error: result.result?.error,
        errorType: result.result?.errorType,
        executionTime: result.result?.executionTime
      });

      if (result.result && result.result.success) {
        const aiResponse = result.result.response;
        const method = result.result.method;
        const executionTime = result.result.executionTime;
        
        console.log('✅ AI回复成功:', {
          responseLength: aiResponse?.length,
          method,
          executionTime
        });
        
        // 添加AI消息到对话记录
        const aiMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: aiResponse,
          timestamp: new Date().toLocaleTimeString(),
          method: method,
          executionTime
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // 语音合成播放AI回复 - 使用云函数TTS服务（优先）
        await handleTextToSpeech(aiResponse);
        
        // 清除之前的错误
        setError('');
      } else {
        // 处理云函数返回的错误
        const errorMsg = result.result?.error || '调用AI服务失败';
        const errorType = result.result?.errorType || 'UnknownError';
        const executionTime = result.result?.executionTime;
        
        console.error('❌ AI服务返回错误:', {
          error: errorMsg,
          errorType,
          executionTime
        });
        
        // 显示详细的错误信息
        let displayError = `AI服务错误: ${errorMsg}`;
        if (executionTime) {
          displayError += ` (${executionTime}ms)`;
        }
        
        // 根据错误类型给出特定提示
        if (errorMsg.includes('API密钥')) {
          displayError += '\n💡 请检查CloudBase控制台中的API_KEY环境变量配置';
        } else if (errorMsg.includes('网络请求失败')) {
          displayError += '\n💡 网络连接问题，请检查网络或稍后重试';
        } else if (errorMsg.includes('状态码')) {
          displayError += '\n💡 API服务返回异常，请检查API配置或联系服务提供商';
        } else if (errorMsg.includes('格式错误') || errorMsg.includes('解析失败')) {
          displayError += '\n💡 API响应格式异常，可能是模型不支持或参数错误';
        }
        
        setError(displayError);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('💥 AI服务调用异常:', error);
      
      // 直接显示真实错误，不使用任何假回复或降级机制
      let detailedError = `🔥 AI服务调用失败: ${error.message}`;
      
      // 提供具体的故障排除建议
      if (error.message.includes('网络') || error.message.includes('network')) {
        detailedError += '\n\n🔧 解决建议:\n• 检查网络连接\n• 验证API服务状态\n• 确认API Base URL配置';
      } else if (error.message.includes('超时') || error.message.includes('timeout')) {
        detailedError += '\n\n🔧 解决建议:\n• API响应超时，可能是模型较慢\n• 尝试切换到更快的模型(如gpt-4o-mini)\n• 检查API服务负载状况';
      } else if (error.message.includes('401')) {
        detailedError += '\n\n🔧 解决建议:\n• API密钥无效或已过期\n• 在CloudBase控制台更新API_KEY环境变量';
      } else {
        detailedError += '\n\n🔧 解决建议:\n• 检查CloudBase控制台日志\n• 验证API配置\n• 联系技术支持';
      }
      
      setError(detailedError);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleStartRecording = async () => {
    if (!isSupported || !audioRecorderRef.current) {
      setError('音频录制不可用');
      return;
    }

    // 检查麦克风权限
    if (microphonePermission === 'denied') {
      setError('麦克风权限被拒绝。请在浏览器设置中允许麦克风权限。\n💡 提示：点击地址栏左侧的锁图标 → 麦克风 → 允许');
      return;
    }

    // 如果权限未知或未授予，尝试请求权限
    if (microphonePermission !== 'granted') {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        return;
      }
    }

    try {
      setError('');
      audioRecorderRef.current.startRecording();
    } catch (error) {
      console.error('启动录音失败:', error);
      setError(`启动录音失败: ${error.message}`);
    }
  };

  const handleStopRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stopRecording();
    }
  };

  const handleConnect = () => {
    setIsConnected(true);
    setStatus('connected');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsRecording(false);
    setStatus('disconnected');
  };

  // 文本转语音处理 - 优先使用云函数TTS，降级到浏览器TTS
  const handleTextToSpeech = async (text, messageId = null) => {
    if (!text || text.trim().length === 0) return;
    
    setIsPlaying(true);
    if (messageId) {
      setReplayingMessageId(messageId);
    }
    console.log('🔊 开始TTS语音合成:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    try {
      // 优先尝试云函数TTS服务
      await ensureLogin();
      const app = getApp();
      
      // 使用用户选择的声音设置
      const ttsSettings = ttsConfig.scenarios.conversation;
      
      const result = await app.callFunction({
        name: 'text-to-speech',
        data: {
          text: text,
          voice: currentVoice, // 使用用户选择的声音
          speed: ttsSettings.speed,
          format: ttsConfig.default.format,
          model: ttsSettings.model
        },
        timeout: 30000 // TTS一般比较快，30秒超时足够
      });

      if (result.result && result.result.success && result.result.audio) {
        console.log('✅ 云函数TTS成功，音频长度:', result.result.audio.length);
        
        // 播放云函数返回的音频
        const audioData = `data:audio/mp3;base64,${result.result.audio}`;
        const audio = new Audio(audioData);
        
        audio.onended = () => {
          setIsPlaying(false);
          setReplayingMessageId(null);
          console.log('🔊 云函数TTS播放完成');
        };
        
        audio.onerror = (error) => {
          console.error('音频播放失败:', error);
          setIsPlaying(false);
          setReplayingMessageId(null);
          // 降级到浏览器TTS
          fallbackToSpeechSynthesis(text);
        };

        await audio.play();
        return;
      } else {
        const errorInfo = result.result?.error;
        const errorMessage = typeof errorInfo === 'object' 
          ? `${errorInfo.message || '语音合成失败'}\n\n🔧 解决建议:\n${(errorInfo.troubleshooting || []).join('\n')}`
          : (errorInfo || '语音合成服务返回失败');
        
        console.error('❌ 云函数TTS失败:', errorInfo);
        
        // 直接显示错误，不使用任何降级机制
        setError(`🔥 语音合成失败: ${errorMessage}`);
        setIsPlaying(false);
        setReplayingMessageId(null);
        return;
      }
    } catch (error) {
      console.error('💥 云函数TTS调用异常:', error);
      
      // 直接显示错误，不使用任何降级机制  
      setError(`🔥 语音合成调用失败: ${error.message}\n\n请检查网络连接和API配置。`);
      setIsPlaying(false);
      setReplayingMessageId(null);
    }
  };

  const testAPIConnection = async () => {
    setIsTestingAPI(true);
    setApiTestResult(null);
    
    try {
      console.log('🔍 VoiceAssistant: 开始API连通性测试...');
      console.log('🔍 当前认证状态:', authState);
      console.log('🔍 缓存的登录状态:', getCachedLoginState());
      
      const startTime = Date.now();
      
      // 确保已认证
      await ensureLogin();
      const app = getApp();
      
      // 调用云函数进行API测试（增加超时设置）
      const result = await app.callFunction({
        name: 'ai-chat',
        data: {
          messages: [
            {
              role: 'user',
              content: 'Hello, this is an API connectivity test.'
            }
          ],
          userLevel: 'intermediate',
          scenario: 'general',
          model: currentModel
        },
        timeout: 60000 // 60秒超时，适应高级模型的响应时间
      });

      const executionTime = Date.now() - startTime;

      if (result.result && result.result.success) {
        setApiTestResult({
          success: true,
          message: 'API连接成功！',
          details: {
            model: currentModel,
            executionTime: result.result.executionTime || executionTime,
            method: result.result.method,
            responseLength: result.result.response?.length || 0
          }
        });
        console.log('✅ API测试成功');
      } else {
        setApiTestResult({
          success: false,
          message: 'API连接失败',
          error: result.result?.error || '未知错误',
          errorType: result.result?.errorType,
          details: {
            model: currentModel,
            executionTime: result.result?.executionTime || executionTime
          }
        });
        console.error('❌ API测试失败:', result.result?.error);
      }
    } catch (error) {
      console.error('💥 API测试异常:', error);
      setApiTestResult({
        success: false,
        message: 'API测试异常',
        error: error.message,
        details: {
          model: currentModel
        }
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶部导航栏 */}
      <div className="glass-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI语音助手</h1>
                <p className="text-sm text-gray-400">智能英语对话练习</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 状态指示器 */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  authState === 'connected' ? 'bg-green-500' :
                  authState === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-400">
                  {authState === 'connected' ? '已连接' :
                   authState === 'connecting' ? '连接中' : '未连接'}
                </span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg glass-card hover:bg-white/20 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="glass-card bg-red-500/10 border-red-500/30 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-red-300 mb-1">服务异常</h3>
                <pre className="text-sm text-red-200 whitespace-pre-wrap bg-red-500/10 p-3 rounded-lg">
                  {error}
                </pre>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-300 text-xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：语音录制区域 */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl shadow-glow p-8">
              
              {/* 录音按钮区域 */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={!isSupported || microphonePermission === 'denied'}
                    className={`relative w-32 h-32 rounded-full transition-all duration-300 transform hover:scale-105 btn-enhanced ${
                      isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-br from-orange-500 to-purple-600 shadow-lg shadow-orange-500/30'
                    } ${!isSupported || microphonePermission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}`}
                  >
                    {isRecording ? (
                      <Square className="w-10 h-10 text-white absolute inset-0 m-auto" />
                    ) : (
                      <Mic className="w-10 h-10 text-white absolute inset-0 m-auto" />
                    )}
                    
                    {/* 录音动画圆环 */}
                    {isRecording && (
                      <div className="absolute -inset-3 rounded-full border-3 border-red-400 animate-ping"></div>
                    )}
                  </button>
                </div>
                
                <div className="mt-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {isRecording ? '正在录音...' : '点击开始对话'}
                  </h2>
                  <p className="text-gray-400">
                    {isRecording ? '说出你想要练习的内容，点击停止完成录音' : 
                     isSupported ? '使用 OpenAI Whisper 进行高精度语音识别' : 
                     '浏览器不支持音频录制'}
                  </p>
                </div>
              </div>

              {/* 当前转录显示 */}
              {currentTranscript && (
                <div className="glass-card bg-orange-500/10 border-orange-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Mic className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-orange-200 font-medium">{currentTranscript}</span>
                    {isRecording && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                  </div>
                </div>
              )}

              {/* 处理状态指示器 */}
              {(isProcessingAudio || isAIProcessing || isPlaying) && (
                <div className="space-y-3 mb-6">
                  {isProcessingAudio && (
                    <div className="glass-card bg-orange-500/10 border-orange-500/30 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <Brain className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-orange-200 font-medium">正在识别语音...</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isAIProcessing && (
                    <div className="glass-card bg-purple-500/10 border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-purple-200 font-medium">AI正在思考回复...</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isPlaying && (
                    <div className="glass-card bg-green-500/10 border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-green-200 font-medium">AI正在朗读回复...</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 音频可视化 */}
              <div className="glass-card rounded-xl p-6 h-24 flex items-center justify-center">
                {isRecording ? (
                  <div className="flex items-center space-x-2">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i}
                        className="w-1 bg-orange-500 rounded-full animate-bounce"
                        style={{
                          height: `${Math.random() * 32 + 16}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">音频波形显示</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：对话记录和设置 */}
          <div className="space-y-6">
            
            {/* 对话记录 */}
            <div className="glass-card rounded-2xl shadow-glow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-gray-300" />
                  <h3 className="font-semibold text-white">对话记录</h3>
                </div>
                <button
                  onClick={() => setMessages([])}
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  清空
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>还没有对话记录</p>
                    <p className="text-sm">开始录音与AI对话</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-br-md'
                            : 'glass-card text-gray-200 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs opacity-70">{message.timestamp}</span>
                            {message.type === 'assistant' && (
                              <button
                                onClick={() => handleTextToSpeech(message.content, message.id)}
                                disabled={replayingMessageId === message.id}
                                className={`p-1 rounded-full transition-colors ${
                                  message.type === 'user' 
                                    ? 'hover:bg-white/20 text-white/80' 
                                    : 'hover:bg-white/20 text-gray-300'
                                } ${replayingMessageId === message.id ? 'animate-spin' : ''}`}
                                title="重新播放"
                              >
                                {replayingMessageId === message.id ? (
                                  <RotateCcw className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {message.method && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.method === 'openai-whisper' ? 'bg-orange-600/30 text-orange-300' :
                              message.method === 'External AI' ? 'bg-green-600/30 text-green-300' :
                              'bg-yellow-600/30 text-yellow-300'
                            }`}>
                              {message.method === 'openai-whisper' ? '🎯' :
                               message.method === 'External AI' ? '🤖' : '🎭'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 设置面板 */}
            {showSettings && (
              <div className="glass-card rounded-2xl shadow-glow p-6">
                <h3 className="font-semibold text-white mb-4">AI设置</h3>
                
                <div className="space-y-6">
                  {/* AI模型选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">AI模型</label>
                    <div className="space-y-2">
                      {AI_MODELS.map((model) => (
                        <button
                          key={model.value}
                          onClick={() => {
                            setCurrentModel(model.value);
                            localStorage.setItem('ai-model', model.value);
                            window.dispatchEvent(new Event('settingsChanged'));
                          }}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left btn-enhanced ${
                            currentModel === model.value
                              ? 'border-purple-500/50 bg-purple-500/20'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-white">{model.label}</h4>
                              <p className="text-xs text-gray-400">{model.description}</p>
                            </div>
                            {currentModel === model.value && (
                              <div className="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI助手声音选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">AI助手声音</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VOICE_OPTIONS.map((voice) => (
                        <div key={voice.value} className="relative">
                          <button
                            onClick={() => {
                              setCurrentVoice(voice.value);
                              localStorage.setItem('ai-voice', voice.value);
                              window.dispatchEvent(new Event('settingsChanged'));
                            }}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-left btn-enhanced ${
                              currentVoice === voice.value
                                ? 'border-orange-500/50 bg-orange-500/20'
                                : 'border-white/20 hover:border-white/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm text-white">{voice.label}</h4>
                                <p className="text-xs text-gray-400">{voice.description}</p>
                              </div>
                              {currentVoice === voice.value && (
                                <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => handleTextToSpeech(`你好，这是 ${voice.label} 的声音测试。`, `test-${voice.value}`)}
                            disabled={replayingMessageId === `test-${voice.value}`}
                            className="absolute top-1 right-1 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors shadow-sm"
                            title="试听声音"
                          >
                            {replayingMessageId === `test-${voice.value}` ? (
                              <RotateCcw className="w-3 h-3 text-orange-400 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3 text-gray-300" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 当前设置显示 */}
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-300">当前:</span>
                        <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded">
                          {AI_MODELS.find(m => m.value === currentModel)?.label}
                        </span>
                        <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded">
                          {VOICE_OPTIONS.find(v => v.value === currentVoice)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 权限状态 */}
            <div className="glass-card rounded-2xl shadow-glow p-6">
              <h3 className="font-semibold text-white mb-4">权限状态</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      microphonePermission === 'granted' ? 'bg-green-500' :
                      microphonePermission === 'denied' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm text-gray-300">麦克风权限</span>
                  </div>
                  {microphonePermission !== 'granted' && (
                    <button
                      onClick={requestMicrophonePermission}
                      className="text-xs px-3 py-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white rounded-full transition-all btn-enhanced"
                    >
                      授权
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isSupported ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-300">浏览器支持</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {isSupported ? 'Chrome' : '需要Chrome'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantPage;