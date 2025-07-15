import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowLeft, ChevronRight } from 'lucide-react';

interface StudyCardProps {
  card: any;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onRating: (isKnown: boolean) => void;
  scheduler: any;
  current: number;
  total: number;
  onBack: () => void;
}

export function StudyCard({ card, showAnswer, onShowAnswer, onRating, scheduler, current, total, onBack }: StudyCardProps) {
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 重置状态当卡片变化时
  useEffect(() => {
    setAnswerRevealed(false);
    setUserChoice(null);
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
          console.warn('音频文件加载失败，降级到TTS');
          fallbackToTTS();
        };
        
        await audioRef.current.play();
      } catch (error) {
        console.warn('音频播放失败，降级到TTS');
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
    setUserChoice(true);
    setAnswerRevealed(true);
  };

  const handleDontKnow = () => {
    setUserChoice(false);
    setAnswerRevealed(true);
  };

  const handleNext = () => {
    if (userChoice !== null) {
      onRating(userChoice);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-white bg-gray-900 pt-10 pr-6 pb-10 pl-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <button 
          onClick={onBack}
          aria-label="返回上一页" 
          className="group w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <ArrowLeft className="w-5 h-5 stroke-current transition-transform group-hover:-translate-x-0.5" />
          <span className="sr-only">返回上一页</span>
        </button>

        <span className="text-sm text-gray-400">{current + 1} / {total}</span>
      </header>

      {/* Word Card */}
      <section className="flex-1 flex flex-col text-center space-y-6 items-center justify-center">
        <div>
          <h2 className="text-4xl tracking-tight font-semibold mb-2">{card.word}</h2>
          <p className="text-lg text-purple-400">
            {card.pronunciation ? `/${card.pronunciation}/` : ''}
          </p>
        </div>
        
        <button 
          onClick={handlePlayAudio}
          disabled={isPlayingAudio}
          aria-label="读音" 
          className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
            isPlayingAudio 
              ? 'bg-purple-600 animate-pulse' 
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <Volume2 className="w-6 h-6 stroke-current" />
        </button>

        {/* 答案详情 - 只在answerRevealed为true时显示 */}
        {answerRevealed && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg max-w-md w-full text-left space-y-4">
            <div className="border-b border-gray-700 pb-4">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">单词详情</h3>
            </div>
            
            {/* 词性 */}
            {card.meanings?.[0]?.partOfSpeech && (
              <div>
                <span className="text-sm text-gray-400">词性：</span>
                <span className="ml-2 text-orange-400">{card.meanings[0].partOfSpeech}</span>
              </div>
            )}
            
            {/* 中文释义 */}
            {card.meanings?.[0]?.definition && (
              <div>
                <span className="text-sm text-gray-400">释义：</span>
                <p className="mt-1 text-white">{card.meanings[0].definition}</p>
              </div>
            )}
            
            {/* 例句 */}
            {card.meanings?.[0]?.example && (
              <div>
                <span className="text-sm text-gray-400">例句：</span>
                <p className="mt-1 text-gray-300 italic">{card.meanings[0].example}</p>
              </div>
            )}
            
            {/* 用户选择显示 */}
            <div className="pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">你的选择：</span>
              <span className={`ml-2 font-medium ${
                userChoice ? 'text-green-400' : 'text-red-400'
              }`}>
                {userChoice ? '认识' : '不认识'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <footer className="space-y-4">
        {!answerRevealed ? (
          // 学习阶段按钮
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleKnow}
              className="py-3 rounded-lg text-white font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 transition"
            >
              认识
            </button>
            <button 
              onClick={handleDontKnow}
              className="py-3 rounded-lg text-white font-medium bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition"
            >
              不认识
            </button>
          </div>
        ) : (
          // 答案阶段按钮
          <button 
            onClick={handleNext}
            className="w-full py-3 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition flex items-center justify-center space-x-2"
          >
            <span>下一个</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </footer>
    </div>
  );
}