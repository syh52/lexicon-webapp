import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onAudioLevel?: (level: number) => void;
  isListening?: boolean;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscript, 
  onAudioLevel,
  isListening = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // 检查浏览器支持
  React.useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
      console.log('语音识别开始');
      setIsRecording(true);
    };

    recognition.onresult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i++) {
        const transcriptPart = speechEvent.results[i][0].transcript;
        if (speechEvent.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onend = () => {
      console.log('语音识别结束');
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const startRecording = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器');
      return;
    }

    try {
      // 请求麦克风权限
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      recognitionRef.current.start();
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      alert('请允许访问麦克风权限');
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  // 文字转语音播放
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // 停止当前播放
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      speechSynthesis.speak(utterance);
    }
  }, []);

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center p-6 bg-red-50 rounded-lg border border-red-200">
        <MicOff className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-red-700 text-center">
          您的浏览器不支持语音识别功能，请使用Chrome浏览器
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 录音按钮 */}
      <div className="relative">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-sm
            transition-all duration-200 shadow-lg transform hover:scale-105
            ${isRecording 
              ? 'bg-red-500 animate-pulse scale-110' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
          `}
          disabled={!isSupported}
        >
          {isRecording ? (
            <div className="flex flex-col items-center">
              <Volume2 className="w-8 h-8 mb-1" />
              <span className="text-xs">松开</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Mic className="w-8 h-8 mb-1" />
              <span className="text-xs">按住</span>
            </div>
          )}
        </button>
        
        {/* 录音动画圈 */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
        )}
      </div>

      {/* 使用说明 */}
      <p className="text-gray-600 text-sm text-center">
        {isRecording ? '正在识别中...' : '按住按钮开始说话'}
      </p>

      {/* 实时识别结果 */}
      {transcript && (
        <div className="w-full max-w-md p-3 bg-gray-100 rounded-lg border">
          <p className="text-sm text-gray-700">
            <span className="font-medium">识别中:</span> {transcript}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;