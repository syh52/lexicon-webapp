import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Square, Settings } from 'lucide-react';
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
  const [authState, setAuthState] = useState('disconnected');

  // 支持的AI模型列表 (基于用户API提供商支持的模型)
  const supportedModels = [
    // GPT-4o系列 (最新)
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (推荐)', category: 'GPT-4o', description: '快速、高效、经济' },
    { value: 'gpt-4o', label: 'GPT-4o', category: 'GPT-4o', description: '最新多模态模型' },
    { value: 'gpt-4o-2024-11-20', label: 'GPT-4o (2024-11-20)', category: 'GPT-4o', description: '最新版本' },
    { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o Latest', category: 'GPT-4o', description: 'ChatGPT最新版本' },
    
    // GPT-4 Turbo系列
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', category: 'GPT-4', description: '强大的推理能力' },
    { value: 'gpt-4', label: 'GPT-4', category: 'GPT-4', description: '经典GPT-4' },
    
    // GPT-3.5系列
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', category: 'GPT-3.5', description: '经济实用' },
    { value: 'gpt-3.5-turbo-0125', label: 'GPT-3.5 Turbo (0125)', category: 'GPT-3.5', description: '优化版本' },
    
    // o1推理系列
    { value: 'o1-preview', label: 'o1 Preview', category: 'o1', description: '推理专家模型' },
    { value: 'o1-mini', label: 'o1 Mini', category: 'o1', description: '轻量推理模型' },
    { value: 'o3-mini', label: 'o3 Mini', category: 'o1', description: '最新推理模型' },
    
    // GPT-4.5和4.1系列
    { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview', category: 'GPT-4.5', description: '下一代预览' },
    { value: 'gpt-4.1', label: 'GPT-4.1', category: 'GPT-4.1', description: '增强版GPT-4' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', category: 'GPT-4.1', description: '轻量版' }
  ];
  const [userLevel, setUserLevel] = useState('intermediate');
  const [scenario, setScenario] = useState('general');
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [microphonePermission, setMicrophonePermission] = useState('unknown');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const audioRecorderRef = useRef(null);

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

      // 调用 speech-recognition 云函数
      const result = await app.callFunction({
        name: 'speech-recognition',
        data: {
          audioData: audioData.base64Audio,
          language: 'zh', // 设置为中文识别
          format: formatInfo?.format || 'webm',
          response_format: 'json',
          temperature: 0
        },
        timeout: 30000 // 30秒超时
      });

      console.log('📥 语音识别结果:', {
        success: result.result?.success,
        method: result.result?.method,
        textLength: result.result?.text?.length || 0
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
        const errorMsg = result.result?.error || '语音识别失败';
        console.error('❌ 语音识别失败:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('💥 语音识别异常:', error);
      throw error;
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
  const handleTextToSpeech = async (text) => {
    if (!text || text.trim().length === 0) return;
    
    setIsPlaying(true);
    console.log('🔊 开始TTS语音合成:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    try {
      // 优先尝试云函数TTS服务
      await ensureLogin();
      const app = getApp();
      
      // 使用配置文件中的对话场景设置
      const ttsSettings = ttsConfig.scenarios.conversation;
      
      const result = await app.callFunction({
        name: 'text-to-speech',
        data: {
          text: text,
          voice: ttsSettings.voice,
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
          console.log('🔊 云函数TTS播放完成');
        };
        
        audio.onerror = (error) => {
          console.error('音频播放失败:', error);
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
        return;
      }
    } catch (error) {
      console.error('💥 云函数TTS调用异常:', error);
      
      // 直接显示错误，不使用任何降级机制  
      setError(`🔥 语音合成调用失败: ${error.message}\n\n请检查网络连接和API配置。`);
      setIsPlaying(false);
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

  // Realtime模式暂时禁用

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题和模式切换 */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎤 语音AI助手</h1>
          <p className="text-gray-300 mb-4">与AI进行实时语音对话，练习英语口语</p>
          
          {/* 模式切换器 */}
          <div className="flex justify-center space-x-4 mb-4">
            <button
              disabled={true}
              className="px-4 py-2 rounded-lg bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
              title="Realtime模式暂不支持，敬请期待"
            >
              🚀 Realtime模式 (暂不支持)
            </button>
            <button
              onClick={() => setAssistantMode('classic')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              🔄 经典模式
            </button>
          </div>
          
          {/* 提示信息 */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center px-4 py-2 bg-blue-900/50 border border-blue-400 rounded-lg text-blue-200 text-sm">
              <span className="mr-2">ℹ️</span>
              当前支持经典模式，Realtime实时语音模式正在开发中
            </div>
          </div>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="glass-card rounded-2xl p-4 mb-6 bg-red-900/50 border border-red-400">
            <div className="flex items-start space-x-3">
              <span className="text-red-400 text-xl flex-shrink-0 mt-1">⚠️</span>
              <div className="flex-1 text-red-200">
                <div className="font-medium mb-1">AI对话服务异常</div>
                <pre className="text-sm whitespace-pre-wrap font-mono bg-red-900/30 p-2 rounded border border-red-400/50">
                  {error}
                </pre>
                <div className="mt-2 text-xs text-red-300">
                  💡 建议：检查控制台日志获取更详细的调试信息
                </div>
              </div>
              <button 
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-300 text-xl flex-shrink-0"
                title="关闭错误提示"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 实时转录显示 */}
        {currentTranscript && (
          <div className="glass-card rounded-2xl p-4 mb-6 bg-blue-900/50 border border-blue-400">
            <div className="flex items-center space-x-3">
              <span className="text-blue-400 text-xl">🎙️</span>
              <span className="text-blue-200">{currentTranscript}</span>
              {isRecording && <div className="animate-pulse text-blue-400">●</div>}
            </div>
          </div>
        )}

        {/* 语音识别处理状态 */}
        {isProcessingAudio && (
          <div className="glass-card rounded-2xl p-4 mb-6 bg-orange-900/50 border border-orange-400">
            <div className="flex items-center space-x-3">
              <span className="text-orange-400 text-xl">🎯</span>
              <span className="text-orange-200">正在使用 OpenAI Whisper 识别语音...</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        {/* AI处理状态 */}
        {isAIProcessing && (
          <div className="glass-card rounded-2xl p-4 mb-6 bg-green-900/50 border border-green-400">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-xl">🤖</span>
              <span className="text-green-200">AI正在思考中...</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        {/* TTS播放状态 */}
        {isPlaying && (
          <div className="glass-card rounded-2xl p-4 mb-6 bg-purple-900/50 border border-purple-400">
            <div className="flex items-center space-x-3">
              <span className="text-purple-400 text-xl">🔊</span>
              <span className="text-purple-200">AI正在朗读回复...</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        )}

        {/* 连接状态 */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-white font-medium">
                {isSupported ? 'OpenAI Whisper 语音识别可用' : '音频录制不可用'}
              </span>
              <span className="text-sm text-gray-400">
                状态: {status}
              </span>
              <span className={`text-sm px-2 py-1 rounded text-white ${
                authState === 'connected' ? 'bg-green-600' :
                authState === 'connecting' ? 'bg-yellow-600' :
                authState === 'error' ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                {authState === 'connected' ? '✅已认证' :
                 authState === 'connecting' ? '🔄认证中' :
                 authState === 'error' ? '❌认证失败' : '⏳待认证'}
              </span>
              <span className={`text-sm px-2 py-1 rounded text-white ${
                microphonePermission === 'granted' ? 'bg-green-600' :
                microphonePermission === 'denied' ? 'bg-red-600' :
                microphonePermission === 'prompt' ? 'bg-yellow-600' : 'bg-gray-600'
              }`}>
                {microphonePermission === 'granted' ? '🎤已授权' :
                 microphonePermission === 'denied' ? '🎤被拒绝' :
                 microphonePermission === 'prompt' ? '🎤需授权' : '🎤未知'}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded">
                {isSupported ? 'Chrome浏览器' : '需要Chrome'}
              </span>
              {microphonePermission === 'denied' || microphonePermission === 'prompt' ? (
                <button
                  onClick={requestMicrophonePermission}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  请求麦克风权限
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* API测试结果显示 */}
        {apiTestResult && (
          <div className={`glass-card rounded-2xl p-4 mb-6 ${
            apiTestResult.success 
              ? 'bg-green-900/50 border border-green-400' 
              : 'bg-red-900/50 border border-red-400'
          }`}>
            <div className="flex items-start space-x-3">
              <span className={`text-xl flex-shrink-0 mt-1 ${
                apiTestResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {apiTestResult.success ? '✅' : '❌'}
              </span>
              <div className="flex-1">
                <div className={`font-medium mb-2 ${
                  apiTestResult.success ? 'text-green-200' : 'text-red-200'
                }`}>
                  {apiTestResult.message}
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-gray-300">
                    <strong>模型:</strong> {apiTestResult.details.model}
                  </div>
                  <div className="text-gray-300">
                    <strong>执行时间:</strong> {apiTestResult.details.executionTime}ms
                  </div>
                  {apiTestResult.success && (
                    <>
                      <div className="text-gray-300">
                        <strong>调用方式:</strong> {apiTestResult.details.method}
                      </div>
                      <div className="text-gray-300">
                        <strong>响应长度:</strong> {apiTestResult.details.responseLength} 字符
                      </div>
                    </>
                  )}
                  {!apiTestResult.success && (
                    <div className="text-red-300">
                      <strong>错误:</strong> {apiTestResult.error}
                      {apiTestResult.errorType && (
                        <span className="ml-2 text-xs bg-red-800 px-1 rounded">
                          {apiTestResult.errorType}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setApiTestResult(null)}
                className={`flex-shrink-0 text-xl hover:opacity-75 ${
                  apiTestResult.success ? 'text-green-400' : 'text-red-400'
                }`}
                title="关闭测试结果"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* AI设置控制面板 */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">🎛️ AI设置</h3>
            <button
              onClick={testAPIConnection}
              disabled={isTestingAPI}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center space-x-2"
            >
              {isTestingAPI ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>测试中...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>测试API</span>
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 模型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">AI模型</label>
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <optgroup label="🚀 GPT-4o系列 (推荐)">
                  {supportedModels.filter(model => model.category === 'GPT-4o').map(model => (
                    <option key={model.value} value={model.value} title={model.description}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚡ GPT-4系列">
                  {supportedModels.filter(model => model.category === 'GPT-4').map(model => (
                    <option key={model.value} value={model.value} title={model.description}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="💰 GPT-3.5系列 (经济)">
                  {supportedModels.filter(model => model.category === 'GPT-3.5').map(model => (
                    <option key={model.value} value={model.value} title={model.description}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🧠 推理专家系列">
                  {supportedModels.filter(model => model.category === 'o1').map(model => (
                    <option key={model.value} value={model.value} title={model.description}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🔮 下一代预览">
                  {supportedModels.filter(model => ['GPT-4.5', 'GPT-4.1'].includes(model.category)).map(model => (
                    <option key={model.value} value={model.value} title={model.description}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="mt-1 text-xs text-gray-400">
                {supportedModels.find(m => m.value === currentModel)?.description || '当前选择的模型'}
              </div>
            </div>
            
            {/* 用户水平 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">英语水平</label>
              <select
                value={userLevel}
                onChange={(e) => setUserLevel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">初学者</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
            </div>
            
            {/* 练习场景 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">练习场景</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">日常对话</option>
                <option value="business">商务英语</option>
                <option value="academic">学术英语</option>
                <option value="travel">旅行英语</option>
              </select>
            </div>
          </div>
        </div>

        {/* 主要控制区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 录音控制 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">语音录制</h3>
            
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={!isSupported}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </button>
                
                {isRecording && (
                  <div className="absolute -inset-2 rounded-full border-2 border-red-400 animate-ping"></div>
                )}
              </div>
              
              <p className="text-gray-300 mb-4">
                {isRecording ? '正在录音... 点击停止' : (isSupported ? '点击开始录音（使用 OpenAI Whisper 识别）' : '浏览器不支持音频录制')}
              </p>
              
              {/* 简单的音频可视化 */}
              <div className="h-20 bg-gray-800 rounded-lg flex items-center justify-center">
                {isRecording ? (
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-2 bg-blue-400 rounded-full animate-bounce`}
                        style={{
                          height: `${Math.random() * 40 + 20}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">音频可视化</span>
                )}
              </div>
            </div>
          </div>

          {/* 对话历史 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">对话记录</h3>
            
            <div className="h-80 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">{message.timestamp}</span>
                        <div className="flex items-center space-x-1">
                          {message.method && message.type === 'user' && (
                            <span className={`text-xs px-1 rounded text-white ${
                              message.method === 'openai-whisper' ? 'bg-blue-600' :
                              message.method === 'mock' || message.method === 'mock-fallback' ? 'bg-yellow-600' :
                              'bg-gray-600'
                            }`}>
                              {message.method === 'openai-whisper' ? '🎯' :
                               message.method === 'mock' || message.method === 'mock-fallback' ? '🎭' : '🔄'}
                            </span>
                          )}
                          {message.method && message.type === 'assistant' && (
                            <span className={`text-xs px-1 rounded text-white ${
                              message.method === 'External AI' ? 'bg-green-600' :
                              message.method === 'Mock Response' ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}>
                              {message.method === 'External AI' ? '🤖' :
                               message.method === 'Mock Response' ? '🎭' : '⚠️'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              onClick={() => setMessages([])}
            >
              清除记录
            </button>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="glass-card rounded-2xl p-6 mt-6">
          <h3 className="text-xl font-semibold text-white mb-4">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-gray-300">
              <h4 className="font-medium text-white mb-2">🎙️ 语音输入</h4>
              <ul className="text-sm space-y-1">
                <li>• 点击麦克风开始录音</li>
                <li>• 使用 OpenAI Whisper API 高精度识别</li>
                <li>• 支持中文、英文等多语言识别</li>
                <li>• 录音结束后自动识别并显示结果</li>
              </ul>
            </div>
            
            <div className="text-gray-300">
              <h4 className="font-medium text-white mb-2">🤖 AI回复</h4>
              <ul className="text-sm space-y-1">
                <li>• 真实AI对话（优先）</li>
                <li>• 智能模拟回复（降级）</li>
                <li>• 英语语音合成播放</li>
                <li>• 完整对话记录和状态</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 测试链接 */}
        <div className="text-center mt-6">
          <a
            href="/test.html"
            target="_blank"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            🔧 打开快速测试页面
          </a>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantPage;