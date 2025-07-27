import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Play, Square, Settings, Sparkles, 
  MessageCircle, Brain, Headphones, RotateCcw, Send, Paperclip, 
  Image as ImageIcon, FileText, Keyboard, User, Bot, Loader2,
  ChevronDown, X, Upload, Trash2
} from 'lucide-react';
import { getApp, ensureLogin, getCachedLoginState, startKeepAlive, stopKeepAlive, updateActivity } from '../utils/cloudbase';
import { startWarmup, startKeepAlive as startFunctionKeepAlive, stopKeepAlive as stopFunctionKeepAlive, smartWarmup } from '../utils/functionKeepAlive';
import { getCachedTTS, cacheTTS } from '../utils/ttsCache';
import { createConcurrentProcessor, PROCESSING_STAGES } from '../utils/concurrentProcessor';
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

  // 新增UI状态
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [inputMode, setInputMode] = useState('text'); // 'text', 'voice', 'file'
  const [showInputOptions, setShowInputOptions] = useState(false);

  // 并发处理相关状态
  const [processingStage, setProcessingStage] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isUsingConcurrentMode, setIsUsingConcurrentMode] = useState(true);

  // AI模型选项（与设置页面保持一致）
  const AI_MODELS = [
    { value: 'o3-mini', label: 'O3-Mini' },
    { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o Latest' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
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
  const [replayingMessageId, setReplayingMessageId] = useState(null);

  const audioRecorderRef = useRef(null);
  const concurrentProcessorRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化并发处理器
  useEffect(() => {
    if (isUsingConcurrentMode) {
      concurrentProcessorRef.current = createConcurrentProcessor({
        feedbackCallbacks: {
          onStageUpdate: (stage, description) => {
            setProcessingStage(stage);
            setCurrentTranscript(description);
          },
          onProgressUpdate: (progress) => {
            setProcessingProgress(progress);
          },
          onPartialResult: (partialData) => {
            console.log('📦 收到部分结果:', partialData);
            if (partialData.stage === PROCESSING_STAGES.SPEECH_RECOGNITION) {
              // 语音识别完成，添加用户消息
              const userMessage = {
                id: Date.now(),
                type: 'user', 
                content: partialData.result,
                timestamp: new Date().toLocaleTimeString(),
                inputMode: 'voice'
              };
              setMessages(prev => [...prev, userMessage]);
            }
          },
          onError: (error) => {
            setError(`处理失败: ${error.message}`);
            setProcessingStage(null);
            setProcessingProgress(0);
          },
          onComplete: () => {
            setProcessingStage(null);
            setProcessingProgress(0);
            setCurrentTranscript('');
          }
        },
        speechRecognizer: handleSpeechRecognitionCore,
        aiResponder: handleAIResponseCore,
        ttsGenerator: handleTextToSpeech
      });
    }
  }, [isUsingConcurrentMode, userLevel, scenario, currentModel]);

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
          
          // 启动连接保活机制
          startKeepAlive();
          
          // 启动云函数预热和保活
          console.log('🔥 启动云函数预热机制...');
          startWarmup(); // 预热关键函数
          startFunctionKeepAlive(); // 启动函数保活
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
    
    // 清理函数：组件卸载时停止保活
    return () => {
      stopKeepAlive();
      stopFunctionKeepAlive();
    };
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
          setInputMode('voice');
        };

        recorder.onStop = async (audioData) => {
          console.log('🛑 录音结束，开始处理...');
          setIsRecording(false);
          setStatus(isConnected ? 'connected' : 'disconnected');
          setIsProcessingAudio(true);
          setInputMode('text'); // 录音结束后切回文本模式

          try {
            if (isUsingConcurrentMode && concurrentProcessorRef.current) {
              // 使用并发处理器处理语音输入
              console.log('🚀 启动并发处理模式');
              await concurrentProcessorRef.current.processVoiceInput(audioData);
            } else {
              // 传统串行处理模式
              console.log('🔄 使用传统串行处理模式');
              setCurrentTranscript('正在识别语音...');
              await handleSpeechRecognition(audioData);
            }
          } catch (error) {
            console.error('❌ 语音处理失败:', error);
            setError(`语音处理失败: ${error.message}`);
          } finally {
            setIsProcessingAudio(false);
            if (!isUsingConcurrentMode) {
              setCurrentTranscript('');
            }
          }
        };

        recorder.onError = (error) => {
          console.error('❌ 录音错误:', error);
          setIsRecording(false);
          setStatus(isConnected ? 'connected' : 'disconnected');
          setCurrentTranscript('');
          setError(`录音失败: ${error.message}`);
          setInputMode('text');
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
      // 清理文件预览URL
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  // 核心语音识别函数（用于并发处理器）
  const handleSpeechRecognitionCore = async (audioData) => {
    console.log('🔄 核心语音识别开始');
    
    updateActivity();
    const app = getApp();
    
    const formatInfo = audioRecorderRef.current?.getAudioFormat();
    
    // 简化版本的语音识别，专注于核心逻辑
    const result = await app.callFunction({
      name: 'speech-recognition',
      data: {
        audioData: audioData.base64Audio,
        language: 'auto',
        format: formatInfo?.format || 'webm',
        response_format: 'json',
        temperature: 0
      },
      timeout: 45000
    });

    if (result.result && result.result.success && result.result.text) {
      return result.result.text.trim();
    } else {
      const errorInfo = result.result?.error;
      throw new Error(typeof errorInfo === 'string' ? errorInfo : '语音识别失败');
    }
  };

  // 核心AI响应函数（用于并发处理器）
  const handleAIResponseCore = async (userInput) => {
    console.log('🤖 核心AI响应开始');
    
    updateActivity();
    const app = getApp();

    const result = await app.callFunction({
      name: 'ai-chat',
      data: {
        messages: [{ role: 'user', content: userInput }],
        userLevel: userLevel,
        scenario: scenario,
        model: currentModel
      },
      timeout: 60000
    });

    if (result.result && result.result.success && result.result.response) {
      const aiResponse = result.result.response.trim();
      
      // 添加AI消息到对话记录
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString(),
        model: currentModel,
        method: result.result.method
      };
      setMessages(prev => [...prev, aiMessage]);

      return aiResponse;
    } else {
      const errorMsg = result.result?.error || 'AI服务失败';
      throw new Error(errorMsg);
    }
  };

  // 处理语音识别 - 调用 OpenAI Whisper API
  const handleSpeechRecognition = async (audioData) => {
    console.log('🔄 开始调用 OpenAI Whisper API 进行语音识别');
    
    try {
      // 更新活动时间戳（移除重复的认证调用）
      updateActivity();
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
          duration: result.result.duration,
          inputMode: 'voice'
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

      // 更新活动时间戳（移除重复的认证调用）
      updateActivity();
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
      
      // 智能预热：用户开始录音时预热语音助手相关函数
      smartWarmup('voice-assistant');
      
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

  // 处理文本输入发送
  const handleSendMessage = async () => {
    const message = textInput.trim();
    if (!message && selectedFiles.length === 0) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString(),
      inputMode: 'text',
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setSelectedFiles([]);

    // 处理AI回复
    try {
      await handleAIResponse(message);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event, type) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      type,
      name: file.name,
      size: file.size,
      preview: type === 'image' ? URL.createObjectURL(file) : null
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setShowInputOptions(false);
  };

  // 移除选中文件
  const removeFile = (fileId) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // 释放预览URL
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  // 文本转语音处理 - 支持缓存的TTS
  const handleTextToSpeech = async (text, messageId = null, voiceOverride = null) => {
    if (!text || text.trim().length === 0) return;
    
    setIsPlaying(true);
    if (messageId) {
      setReplayingMessageId(messageId);
    }
    console.log('🔊 开始TTS语音合成:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    try {
      // 更新活动时间戳
      updateActivity();
      
      // 使用用户选择的声音设置
      const ttsSettings = ttsConfig.scenarios.conversation;
      const voice = voiceOverride || currentVoice;
      const speed = ttsSettings.speed;
      const model = ttsSettings.model;
      
      // 首先检查缓存
      const cachedAudio = getCachedTTS(text, voice, speed, model);
      if (cachedAudio) {
        console.log('🎯 使用缓存的TTS音频');
        
        // 播放缓存的音频
        const audioData = `data:audio/mp3;base64,${cachedAudio}`;
        const audio = new Audio(audioData);
        
        audio.onended = () => {
          setIsPlaying(false);
          setReplayingMessageId(null);
          console.log('🔊 缓存TTS播放完成');
        };
        
        audio.onerror = (error) => {
          console.error('缓存音频播放失败:', error);
          setIsPlaying(false);
          setReplayingMessageId(null);
        };

        await audio.play();
        return;
      }
      
      // 缓存未命中，调用云函数TTS
      console.log('💫 缓存未命中，调用云函数TTS');
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'text-to-speech',
        data: {
          text: text,
          voice: voice,
          speed: speed,
          format: ttsConfig.default.format,
          model: model
        },
        timeout: 30000 // TTS一般比较快，30秒超时足够
      });

      if (result.result && result.result.success && result.result.audio) {
        console.log('✅ 云函数TTS成功，音频长度:', result.result.audio.length);
        
        // 缓存TTS结果
        cacheTTS(text, voice, speed, model, result.result.audio);
        
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
      
      // 更新活动时间戳（移除重复的认证调用）
      updateActivity();
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

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-400 mb-4">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>开始对话吧...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="glass-card sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI智能助手</h1>
                <p className="text-sm text-gray-400">多模态对话 • 智能交互</p>
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
                <span className="text-xs px-2 py-1 bg-purple-500/30 text-purple-300 rounded">
                  {AI_MODELS.find(m => m.value === currentModel)?.label}
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
        <div className="max-w-6xl mx-auto px-6 mt-4 flex-shrink-0">
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
      <div className="flex-1 flex overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex">
          
          {/* 主对话区域 */}
          <div className="flex-1 flex flex-col">
            
            {/* 对话消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  renderEmptyState()
                ) : (
                  // 对话消息
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 ${
                        message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      {/* 头像 */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-br from-orange-500 to-purple-600' 
                          : 'glass-card'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      
                      {/* 消息内容 */}
                      <div className={`flex-1 max-w-3xl ${
                        message.type === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        <div className={`inline-block p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-br-md'
                            : 'glass-card text-gray-200 rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          
                          {/* 文件附件显示 */}
                          {message.files && message.files.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.files.map((file, idx) => (
                                <div key={idx} className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                                  {file.type === 'image' ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  <span className="text-xs">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 消息元信息 */}
                        <div className={`flex items-center space-x-2 mt-2 text-xs text-gray-400 ${
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}>
                          <span>{message.timestamp}</span>
                          
                          {/* 输入方式标识 */}
                          {message.inputMode && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              message.inputMode === 'voice' ? 'bg-orange-600/30 text-orange-300' :
                              message.inputMode === 'text' ? 'bg-blue-600/30 text-blue-300' :
                              'bg-green-600/30 text-green-300'
                            }`}>
                              {message.inputMode === 'voice' ? '🎙️' :
                               message.inputMode === 'text' ? '💬' : '📎'}
                            </span>
                          )}
                          
                          {/* AI回复重播按钮 */}
                          {message.type === 'assistant' && (
                            <button
                              onClick={() => handleTextToSpeech(message.content, message.id)}
                              disabled={replayingMessageId === message.id}
                              className={`p-1 rounded-full transition-colors hover:bg-white/20 text-gray-400 hover:text-gray-200 ${
                                replayingMessageId === message.id ? 'animate-spin' : ''
                              }`}
                              title="重新播放"
                            >
                              {replayingMessageId === message.id ? (
                                <Loader2 className="w-4 h-4" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {/* 方法标识 */}
                          {message.method && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.method === 'openai-whisper' ? 'bg-orange-600/30 text-orange-300' :
                              message.method === 'External AI' ? 'bg-green-600/30 text-green-300' :
                              'bg-yellow-600/30 text-yellow-300'
                            }`}>
                              {message.method === 'openai-whisper' ? '🎯 Whisper' :
                               message.method === 'External AI' ? '🤖 AI' : '🎭 模拟'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* 处理状态指示器 */}
                {(isProcessingAudio || isAIProcessing || currentTranscript) && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="glass-card px-3 py-2 rounded-lg max-w-sm">
                        <div className="flex items-center space-x-2">
                          {isProcessingAudio && (
                            <>
                              <Brain className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-200">识别中...</span>
                            </>
                          )}
                          {isAIProcessing && (
                            <>
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              <span className="text-sm text-purple-200">思考中...</span>
                            </>
                          )}
                          {currentTranscript && !isProcessingAudio && !isAIProcessing && (
                            <>
                              <Mic className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-orange-200">{currentTranscript}</span>
                            </>
                          )}
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                        
                        {/* 并发处理进度条 */}
                        {isUsingConcurrentMode && processingProgress > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                              <span>处理进度</span>
                              <span>{Math.round(processingProgress * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-600/30 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${processingProgress * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 选中文件显示 */}
            {selectedFiles.length > 0 && (
              <div className="px-6 pb-2">
                <div className="glass-card rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">已选择文件</span>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map(file => (
                      <div key={file.id} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                        {file.type === 'image' ? (
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 输入区域 */}
            <div className="px-6 pb-6">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-end space-x-3">
                  
                  {/* 输入选项按钮 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowInputOptions(!showInputOptions)}
                      className="p-3 rounded-xl glass-card hover:bg-white/20 transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-gray-300" />
                    </button>
                    
                    {/* 输入选项菜单 */}
                    {showInputOptions && (
                      <div className="absolute bottom-full left-0 mb-2 glass-card rounded-xl p-2 min-w-48">
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowInputOptions(false);
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/20 transition-colors text-left"
                        >
                          <FileText className="w-5 h-5 text-blue-400" />
                          <span className="text-sm text-gray-200">上传文档</span>
                        </button>
                        <button
                          onClick={() => {
                            imageInputRef.current?.click();
                            setShowInputOptions(false);
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/20 transition-colors text-left"
                        >
                          <ImageIcon className="w-5 h-5 text-green-400" />
                          <span className="text-sm text-gray-200">上传图片</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 文本输入框 */}
                  <div className="flex-1">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        inputMode === 'voice' ? '正在录音中...' : 
                        isRecording ? '录音进行中...' : 
                        '输入消息或点击麦克风说话...'
                      }
                      disabled={inputMode === 'voice' || isRecording}
                      className="w-full bg-transparent text-gray-200 placeholder-gray-400 resize-none outline-none max-h-32 min-h-[2.5rem]"
                      rows={1}
                      style={{
                        height: 'auto',
                        minHeight: '2.5rem'
                      }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                  </div>

                  {/* 语音输入按钮 */}
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={!isSupported || microphonePermission === 'denied'}
                    className={`p-3 rounded-xl transition-all ${
                      isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                        : 'glass-card hover:bg-white/20 text-gray-300'
                    } ${!isSupported || microphonePermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isRecording ? (
                      <Square className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  {/* 发送按钮 */}
                  <button
                    onClick={handleSendMessage}
                    disabled={(!textInput.trim() && selectedFiles.length === 0) || isAIProcessing}
                    className={`p-3 rounded-xl transition-all ${
                      (textInput.trim() || selectedFiles.length > 0) && !isAIProcessing
                        ? 'bg-gradient-to-br from-orange-500 to-purple-600 text-white hover:from-orange-600 hover:to-purple-700'
                        : 'glass-card text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isAIProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* 输入状态提示 */}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <div className="flex items-center space-x-4">
                    {microphonePermission !== 'granted' && (
                      <span className="text-yellow-400">⚠️ 需要麦克风权限</span>
                    )}
                    {isRecording && (
                      <span className="text-orange-400 flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>录音中...</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Enter发送 • Shift+Enter换行</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏设置面板 */}
          {showSettings && (
            <div className="w-80 flex-shrink-0 border-l border-white/10">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">AI设置</h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
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
                    <div className="space-y-2">
                      {VOICE_OPTIONS.map((voice) => (
                        <button
                          key={voice.value}
                          onClick={() => {
                            setCurrentVoice(voice.value);
                            localStorage.setItem('ai-voice', voice.value);
                            window.dispatchEvent(new Event('settingsChanged'));
                            // 试听声音
                            handleTextToSpeech(`你好，这是 ${voice.label} 的声音测试。`, `test-${voice.value}`, voice.value);
                          }}
                          disabled={replayingMessageId === `test-${voice.value}`}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left btn-enhanced ${
                            currentVoice === voice.value
                              ? 'border-orange-500/50 bg-orange-500/20'
                              : 'border-white/20 hover:border-white/40'
                          } ${replayingMessageId === `test-${voice.value}` ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-white">{voice.label}</h4>
                              <p className="text-xs text-gray-400">{voice.description}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {replayingMessageId === `test-${voice.value}` && (
                                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                              )}
                              {currentVoice === voice.value && (
                                <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 处理模式切换 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      处理模式
                      <span className="text-xs text-gray-400 ml-2">(实验性功能)</span>
                    </label>
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {isUsingConcurrentMode ? '并发处理' : '串行处理'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {isUsingConcurrentMode 
                            ? '智能预热，响应更快' 
                            : '传统方式，稳定可靠'
                          }
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isUsingConcurrentMode}
                          onChange={(e) => setIsUsingConcurrentMode(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="pt-4 border-t border-white/20">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">快捷操作</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setMessages([])}
                        className="w-full p-3 rounded-lg glass-card hover:bg-white/20 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-200">清空对话</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.doc,.docx,.md"
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
    </div>
  );
};

export default VoiceAssistantPage;