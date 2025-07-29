import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowRight, Check, X, Settings, User, HelpCircle } from 'lucide-react';
import { StudyCard as StudyCardType, StudyChoice } from '../../types';

interface StudyCardProps {
  card: StudyCardType;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onChoice: (choice: StudyChoice) => void; // 支持三选项
  scheduler: any;
  current: number;
  total: number;
  onBack: () => void;
}

export function StudyCard({ card, showAnswer, onShowAnswer, onChoice, scheduler, current, total, onBack }: StudyCardProps) {
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [userChoice, setUserChoice] = useState<StudyChoice | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 重置状态当卡片变化时
  useEffect(() => {
    setAnswerRevealed(false);
    setUserChoice(null);
    setShowHint(false);
    setIsPlayingAudio(false);
    setAudioError(null);
    
    // 清理音频资源
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('error', () => {});
      audioRef.current = null;
    }
    
    // 清理TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [card]);

  const handlePlayAudio = async () => {
    if (isPlayingAudio) return;
    
    setIsPlayingAudio(true);
    setAudioError(null);
    
    // 优先使用真实音频文件
    if (card.originalWord?.audioUrl) {
      try {
        // 停止之前的音频
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(card.originalWord.audioUrl);
        
        // 设置事件监听器
        const handleAudioEnd = () => {
          setIsPlayingAudio(false);
        };
        
        const handleAudioError = () => {
          console.log('音频文件加载失败，切换到TTS');
          setAudioError('音频加载失败，使用语音合成');
          fallbackToTTS();
        };
        
        audioRef.current.addEventListener('ended', handleAudioEnd);
        audioRef.current.addEventListener('error', handleAudioError);
        
        await audioRef.current.play();
        
      } catch (error) {
        console.log('音频播放失败，切换到TTS:', error);
        setAudioError('音频播放失败，使用语音合成');
        fallbackToTTS();
      }
    } else {
      // 降级到TTS
      fallbackToTTS();
    }
  };

  const fallbackToTTS = () => {
    try {
      if (card.word && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(card.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.onend = () => {
          setIsPlayingAudio(false);
          if (audioError) {
            // 3秒后清除错误提示
            setTimeout(() => setAudioError(null), 3000);
          }
        };
        utterance.onerror = () => {
          setIsPlayingAudio(false);
          setAudioError('语音合成失败');
          setTimeout(() => setAudioError(null), 3000);
        };
        
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
        setAudioError('语音功能不可用');
        setTimeout(() => setAudioError(null), 3000);
      }
    } catch (error) {
      console.error('TTS播放失败:', error);
      setIsPlayingAudio(false);
      setAudioError('语音播放失败');
      setTimeout(() => setAudioError(null), 3000);
    }
  };

  const handleKnow = () => {
    setUserChoice(StudyChoice.Know);
    setAnswerRevealed(true);
    // 添加翻转卡片的逻辑
    setTimeout(() => {
      const flashcard = document.querySelector('.flashcard');
      if (flashcard) {
        flashcard.classList.add('flipped');
      }
    }, 100);
  };

  const handleHint = () => {
    setShowHint(true);
    // 显示提示但不立即翻转卡片
  };

  const handleKnowAfterHint = () => {
    setUserChoice(StudyChoice.Hint);
    setAnswerRevealed(true);
    // 添加翻转卡片的逻辑
    setTimeout(() => {
      const flashcard = document.querySelector('.flashcard');
      if (flashcard) {
        flashcard.classList.add('flipped');
      }
    }, 100);
  };

  const handleDontKnow = () => {
    setUserChoice(StudyChoice.Unknown);
    setAnswerRevealed(true);
    // 添加翻转卡片的逻辑
    setTimeout(() => {
      const flashcard = document.querySelector('.flashcard');
      if (flashcard) {
        flashcard.classList.add('flipped');
      }
    }, 100);
  };

  const handleNext = () => {
    if (userChoice !== null) {
      // 重置卡片状态
      const flashcard = document.querySelector('.flashcard');
      if (flashcard) {
        flashcard.classList.remove('flipped');
      }
      setAnswerRevealed(false);
      setUserChoice(null);
      setShowHint(false);
      onChoice(userChoice);
    }
  };

  return (
    <div className="text-white relative min-h-screen animate-blur-in animate-delay-200">
      
      {/* Main Container - Mobile Optimized */}
      <div className="min-h-screen flex flex-col relative p-3 sm:p-6 items-center justify-start sm:justify-center z-10 space-y-3 sm:space-y-6 pt-4 sm:pt-0">
        


        {/* Enhanced Progress Bar - Compressed */}
        <div className="w-full max-w-md animate-blur-in animate-delay-300">
          <div className="glass-card-strong rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-glow relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-2xl"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-2 sm:mb-4">
                <span className="text-xs sm:text-sm font-semibold text-purple-300 uppercase tracking-wide">学习进度</span>
                <span className="text-xs sm:text-sm font-bold text-white bg-white/10 px-2 py-1 sm:px-3 rounded-full">{current + 1}/{total}</span>
              </div>
              <div className="study-progress-bar mb-1 sm:mb-2">
                <div 
                  className="study-progress-fill shadow-glow" 
                  style={{ width: `${((current + 1) / total) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-white/60 text-center">
                {Math.round(((current + 1) / total) * 100)}% 完成
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-col w-full max-w-md space-y-4 sm:space-y-6 items-center flex-1 justify-center animate-blur-in animate-delay-400">
          {/* Enhanced Flashcard - Mobile Height */}
          <div className="w-full h-64 sm:h-80 md:h-96 perspective-container">
            <div className={`flashcard w-full h-full relative transition-all duration-700 ease-in-out ${
              answerRevealed ? 'flipped' : ''
            }`} style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Enhanced Front Side */}
              <div className="flashcard-front absolute inset-0 flex glass-card-strong rounded-3xl border-2 border-white/30 items-center justify-center shadow-glow-blue" style={{ backfaceVisibility: 'hidden' }}>
                <div className="text-center p-4 sm:p-6 md:p-8 w-full relative">
                  <div className="mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm text-purple-300 font-medium uppercase tracking-wider mb-1 sm:mb-2">VOCABULARY</div>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 tracking-tight bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent leading-tight">{card.word}</h2>
                  </div>
                  <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 mx-auto mb-4 sm:mb-6 rounded-full shadow-glow"></div>
                  <button 
                    onClick={handlePlayAudio}
                    disabled={isPlayingAudio}
                    aria-label="Play pronunciation" 
                    className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition-all duration-300 mx-auto hover:scale-110 active:scale-95 btn-enhanced modern-focus ${
                      isPlayingAudio 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-glow' 
                        : 'glass-card hover:glass-card-strong text-white border border-white/30'
                    }`}
                  >
                    <Volume2 className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>
                  
                  {/* Enhanced Hint Content - Mobile Compressed */}
                  {showHint && card.meanings?.[0]?.example && (
                    <div className="mt-4 sm:mt-6 glass-card-strong rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-500/40 relative overflow-hidden animate-blur-in">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl sm:rounded-2xl"></div>
                      <div className="relative">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-400/30 rounded-lg flex items-center justify-center">
                            <span className="text-blue-300 text-xs sm:text-sm">💡</span>
                          </div>
                          <p className="text-xs sm:text-sm text-blue-300 font-semibold uppercase tracking-wide">提示</p>
                        </div>
                        <p className="text-sm sm:text-base text-blue-100 italic font-medium">"{card.meanings[0].example}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Back Side */}
              <div className="flashcard-back absolute inset-0 glass-card-strong rounded-3xl border-2 border-white/30 p-6 sm:p-8 shadow-glow" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="h-full flex flex-col justify-center relative">
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                      <div className="text-xs sm:text-sm text-blue-300 font-medium uppercase tracking-wider">DEFINITION</div>
                      {card.meanings?.[0]?.partOfSpeech && (
                        <span className="text-xs font-semibold text-purple-200 bg-gradient-to-r from-purple-500/30 to-blue-500/30 px-2 py-1 sm:px-3 sm:py-1 rounded-full border border-purple-400/40 shadow-glow">
                          {card.meanings[0].partOfSpeech}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3 leading-relaxed">{card.meanings?.[0]?.definition || '释义暂无'}</h3>
                    <div className="w-10 sm:w-12 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mb-2 sm:mb-3"></div>
                    <p className="text-xs sm:text-sm text-blue-200/80 font-medium">English Definition</p>
                  </div>
                  
                  {card.meanings?.[0]?.example && (
                    <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
                      <div className="relative">
                        <div className="text-xs text-green-300 font-medium uppercase tracking-wide mb-2">EXAMPLE</div>
                        <p className="text-sm sm:text-base text-white mb-2 font-medium italic">"{card.meanings[0].example}"</p>
                        {card.meanings[0].translation && (
                          <p className="text-xs sm:text-sm text-green-200/70">「{card.meanings[0].translation}」</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Buttons - Compressed */}
          <div className={`flex flex-col space-y-3 sm:space-y-4 w-full animate-blur-in animate-delay-500 ${answerRevealed ? 'hidden' : ''}`}>
            {!showHint ? (
              <>
                <button 
                  onClick={handleKnow}
                  className="w-full study-button-primary hover:scale-105 active:scale-95 transition-all duration-300 flex font-semibold text-white rounded-2xl p-4 space-x-3 items-center justify-center btn-enhanced modern-focus shadow-glow group"
                >
                  <div className="w-7 h-7 bg-purple-400/30 rounded-lg flex items-center justify-center group-hover:bg-purple-400/50 transition-colors">
                    <Check className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-base">认识</span>
                </button>
                
                <button 
                  onClick={handleHint}
                  className="w-full study-button-secondary hover:scale-105 active:scale-95 transition-all duration-300 flex font-semibold text-white rounded-2xl p-4 space-x-3 items-center justify-center btn-enhanced modern-focus group"
                >
                  <div className="w-7 h-7 bg-blue-400/30 rounded-xl flex items-center justify-center group-hover:bg-blue-400/50 transition-colors">
                    <HelpCircle className="w-4 h-4 text-blue-300" />
                  </div>
                  <span className="text-base">提示</span>
                </button>
                
                <button 
                  onClick={handleDontKnow}
                  className="w-full study-button-accent hover:scale-105 active:scale-95 transition-all duration-300 flex font-semibold text-white rounded-2xl p-4 space-x-3 items-center justify-center btn-enhanced modern-focus group"
                >
                  <div className="w-7 h-7 bg-indigo-400/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-400/50 transition-colors">
                    <X className="w-4 h-4 text-indigo-300" />
                  </div>
                  <span className="text-base">不认识</span>
                </button>
              </>
            ) : (
              <>
                <div className="text-center glass-card-strong rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-500/40 relative overflow-hidden mb-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10"></div>
                  <div className="relative">
                    <div className="text-xs text-blue-300 font-semibold uppercase tracking-wide mb-1 sm:mb-2">提示已显示</div>
                    <p className="text-xs sm:text-sm text-blue-100 font-medium">看完提示后，你现在认识这个单词吗？</p>
                  </div>
                </div>
                <button 
                  onClick={handleKnowAfterHint}
                  className="w-full study-button-primary hover:scale-105 active:scale-95 transition-all duration-300 flex font-semibold text-white rounded-2xl p-4 space-x-3 items-center justify-center btn-enhanced modern-focus group"
                >
                  <div className="w-7 h-7 bg-purple-400/30 rounded-xl flex items-center justify-center group-hover:bg-purple-400/50 transition-colors">
                    <Check className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-base">现在认识了</span>
                </button>
                
                <button 
                  onClick={handleDontKnow}
                  className="w-full study-button-accent hover:scale-105 active:scale-95 transition-all duration-300 flex font-semibold text-white rounded-2xl p-4 space-x-3 items-center justify-center btn-enhanced modern-focus group"
                >
                  <div className="w-7 h-7 bg-indigo-400/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-400/50 transition-colors">
                    <X className="w-4 h-4 text-indigo-300" />
                  </div>
                  <span className="text-base">还是不认识</span>
                </button>
              </>
            )}
          </div>

          {/* Enhanced Next Button - Compressed */}
          <button 
            onClick={handleNext}
            className={`w-full gradient-primary hover:scale-105 active:scale-95 transition-all duration-300 flex font-bold text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 space-x-3 items-center justify-center btn-enhanced modern-focus shadow-glow group animate-blur-in animate-delay-600 ${
              !answerRevealed ? 'hidden' : ''
            }`}
          >
            <span className="text-sm sm:text-base">下一个单词</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}