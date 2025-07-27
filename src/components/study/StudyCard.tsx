import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowRight, Check, X, Settings, User, ArrowLeft, HelpCircle } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 重置状态当卡片变化时
  useEffect(() => {
    setAnswerRevealed(false);
    setUserChoice(null);
    setShowHint(false);
    setIsPlayingAudio(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [card]);

  const handlePlayAudio = async () => {
    if (isPlayingAudio) return;
    
    setIsPlayingAudio(true);
    
    // 优先使用真实音频文件
    if (card.originalWord?.audioUrl) {
      try {
        // 停止之前的音频
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(card.originalWord.audioUrl);
        audioRef.current.onended = () => setIsPlayingAudio(false);
        audioRef.current.onerror = () => {
          fallbackToTTS();
        };
        
        await audioRef.current.play();
      } catch (error) {
        fallbackToTTS();
      }
    } else {
      // 降级到TTS
      fallbackToTTS();
    }
  };

  const fallbackToTTS = () => {
    if (card.word) {
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
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
    <div className="bg-zinc-900 text-white font-geist overflow-hidden">
      {/* Hero Section */}
      <div className="min-h-screen flex flex-col relative pt-6 pr-6 pb-6 pl-6 items-center justify-center">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-zinc-900 to-zinc-900"></div>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex z-10 opacity-90 animate-fade-in pt-6 pr-6 pb-6 pl-6 items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <h1 className="text-xl font-medium">Lexicon</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-800 hover:bg-zinc-700 transition-colors">
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
            <button className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-800 hover:bg-zinc-700 transition-colors">
              <User className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute top-20 left-6 right-6 opacity-90 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-400">Progress</span>
            <span className="text-sm text-zinc-400">{current + 1}/{total}</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
              style={{ width: `${((current + 1) / total) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col z-10 w-full max-w-sm space-y-8 items-center">
          {/* Flashcard */}
          <div className="flashcard-container relative w-full h-80 opacity-100 animate-fade-in">
            <div className={`flashcard w-full h-full relative transition-transform duration-500 ${
              answerRevealed ? 'flipped' : ''
            }`} style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Front Side */}
              <div className="flashcard-front absolute inset-0 flex bg-zinc-800/80 border-zinc-800 border rounded-3xl shadow-md backdrop-blur-sm items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                <div className="text-center p-8 w-full">
                  <h2 className="text-5xl font-medium text-white mb-4 tracking-tight">{card.word}</h2>
                  <div className="w-12 h-0.5 bg-indigo-500 mx-auto mb-4"></div>
                  <button 
                    onClick={handlePlayAudio}
                    disabled={isPlayingAudio}
                    aria-label="Play pronunciation" 
                    className={`mt-2 inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors shadow-md mx-auto ${
                      isPlayingAudio 
                        ? 'bg-indigo-600' 
                        : 'bg-indigo-500 hover:bg-indigo-600'
                    }`}
                  >
                    <Volume2 className="w-6 h-6 text-white" />
                  </button>
                  
                  {/* 提示内容 */}
                  {showHint && card.meanings?.[0]?.example && (
                    <div className="mt-6 bg-zinc-900/50 rounded-2xl p-4 border border-zinc-700">
                      <p className="text-sm text-yellow-400 mb-2">💡 提示</p>
                      <p className="text-sm text-zinc-300 italic">"{card.meanings[0].example}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Side */}
              <div className="flashcard-back absolute inset-0 bg-zinc-800/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="h-full flex flex-col justify-center">
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-3">
                      {card.meanings?.[0]?.partOfSpeech && (
                        <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded-full">
                          {card.meanings[0].partOfSpeech}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2">{card.meanings?.[0]?.definition || '释义暂无'}</h3>
                    <p className="text-sm text-zinc-400">The meaning of this word in English</p>
                  </div>
                  
                  {card.meanings?.[0]?.example && (
                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800">
                      <p className="text-sm text-zinc-300 mb-2">"{card.meanings[0].example}"</p>
                      <p className="text-sm text-zinc-500">"例句的中文翻译。"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex flex-col space-y-3 w-full opacity-100 animate-fade-in ${answerRevealed ? 'hidden' : ''}`}>
            {!showHint ? (
              <>
                {/* 初始三选项 */}
                <button 
                  onClick={handleKnow}
                  className="know-btn w-full hover:bg-green-600 transition-all duration-200 flex active:scale-95 font-medium text-white bg-green-500 rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center"
                >
                  <Check className="w-5 h-5" />
                  <span>认识</span>
                </button>
                
                <button 
                  onClick={handleHint}
                  className="hint-btn w-full hover:bg-yellow-600 transition-all duration-200 flex active:scale-95 font-medium text-white bg-yellow-500 rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>提示</span>
                </button>
                
                <button 
                  onClick={handleDontKnow}
                  className="dont-know-btn w-full hover:bg-red-600 transition-all duration-200 flex active:scale-95 font-medium text-white bg-red-500 rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center"
                >
                  <X className="w-5 h-5" />
                  <span>不认识</span>
                </button>
              </>
            ) : (
              <>
                {/* 提示后的选项 */}
                <div className="text-center text-sm text-yellow-400 mb-2">
                  看完提示后，你现在认识这个单词吗？
                </div>
                <button 
                  onClick={handleKnowAfterHint}
                  className="know-after-hint-btn w-full hover:bg-yellow-600 transition-all duration-200 flex active:scale-95 font-medium text-white bg-yellow-500 rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center"
                >
                  <Check className="w-5 h-5" />
                  <span>现在认识了</span>
                </button>
                
                <button 
                  onClick={handleDontKnow}
                  className="still-dont-know-btn w-full hover:bg-red-600 transition-all duration-200 flex active:scale-95 font-medium text-white bg-red-500 rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center"
                >
                  <X className="w-5 h-5" />
                  <span>仍然不认识</span>
                </button>
              </>
            )}
          </div>

          {/* Next Button */}
          <button 
            onClick={handleNext}
            className={`next-btn w-full hover:bg-zinc-700 transition-all duration-200 flex active:scale-95 font-medium text-white bg-zinc-800 border-zinc-800 border rounded-2xl pt-4 pr-6 pb-4 pl-6 shadow-md space-x-3 items-center justify-center ${
              !answerRevealed ? 'hidden' : ''
            }`}
          >
            <span>Next Word</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Footer */}
        <div className="absolute bottom-6 left-6 right-6 opacity-90 animate-fade-in">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-xl font-medium text-green-400">
                  {Math.floor(((current + 1) / total) * 100 * 0.6)}
                </div>
                <div className="text-xs text-zinc-500">Known</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium text-red-400">
                  {Math.floor(((current + 1) / total) * 100 * 0.4)}
                </div>
                <div className="text-xs text-zinc-500">Learning</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium text-zinc-400">
                  {total - current - 1}
                </div>
                <div className="text-xs text-zinc-500">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}