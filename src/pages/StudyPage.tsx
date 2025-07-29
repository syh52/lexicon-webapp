import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudyCard } from '../components/study/StudyCard';
import { DailyStudyPlan } from '../services/DailyPlanGenerator';
import dailyPlanService from '../services/dailyPlanService';
import wordbookService, { Word, StudyRecord } from '../services/wordbookService';
import { SM2Service, createStudySession } from '../services/sm2Service';
import { DailyStudySession } from '../utils/sm2Algorithm';
import { StudyChoice, SM2Card } from '../types';
import { getApp, ensureLogin } from '../utils/cloudbase';
import { studySessionService, StudySessionState } from '../services/studySessionService';
import { BACKGROUNDS, TEXT_COLORS } from '../constants/design';

interface StudySession {
  plan: DailyStudyPlan;
  sm2Session: DailyStudySession;
  currentCard: any;
  wordsMap: Map<string, any>;
  isCompleted: boolean;
  sessionState?: StudySessionState; // 添加会话状态
}

export default function StudyPage() {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sm2Service] = useState(() => new SM2Service());
  const [backgroundSaveQueue, setBackgroundSaveQueue] = useState<Array<{wordId: string, choice: StudyChoice, timestamp: number}>>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // 🔥 按需加载状态
  const [additionalWordsCache, setAdditionalWordsCache] = useState<Map<string, any>>(new Map());
  const [isLoadingMoreWords, setIsLoadingMoreWords] = useState(false);
  
  // 使用ref避免user对象引用变化导致重复初始化
  const initializationRef = useRef<{
    userId: string | null;
    wordbookId: string | null;
    initialized: boolean;
    lastInitTime: number;
  }>({
    userId: null,
    wordbookId: null,
    initialized: false,
    lastInitTime: 0
  });

  // 稳定的用户ID，避免对象引用变化
  const stableUserId = useMemo(() => user?.uid || null, [user?.uid]);
  
  // 🔥 按需加载更多单词的函数
  const loadMoreWords = useCallback(async (wordIds: string[]): Promise<Map<string, any>> => {
    if (isLoadingMoreWords || !wordbookId) return new Map();
    
    // 检查哪些单词还没有缓存
    const missingWordIds = wordIds.filter(id => !additionalWordsCache.has(id));
    if (missingWordIds.length === 0) {
      return additionalWordsCache;
    }
    
    try {
      setIsLoadingMoreWords(true);
      console.log(`🔄 按需加载 ${missingWordIds.length} 个单词...`);
      
      const appInstance = await getApp();
      const wordsResult = await appInstance.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit: 50, offset: additionalWordsCache.size + 20 }
      });
      
      if (wordsResult.result?.success && wordsResult.result?.data) {
        const newWords = wordsResult.result.data;
        const newWordsMap = new Map(additionalWordsCache);
        
        newWords.forEach((word: any) => {
          newWordsMap.set(word._id, word);
        });
        
        setAdditionalWordsCache(newWordsMap);
        console.log(`✅ 成功加载 ${newWords.length} 个单词到缓存`);
        return newWordsMap;
      }
    } catch (error) {
      console.error('按需加载单词失败:', error);
    } finally {
      setIsLoadingMoreWords(false);
    }
    
    return additionalWordsCache;
  }, [additionalWordsCache, isLoadingMoreWords, wordbookId]);
  
  const initializeStudySession = useCallback(async () => {
    const now = Date.now();
    const currentInit = initializationRef.current;
    
    // 🔒 增强防抖机制 - 防止频繁调用
    if (isInitializing) {
      console.log('⏸️ 学习会话正在初始化中，跳过重复请求');
      return;
    }
    
    // 🔒 时间防抖：300ms内的重复调用直接忽略
    if (now - currentInit.lastInitTime < 300) {
      console.log('⏸️ 频繁调用防抖，跳过请求');
      return;
    }
    
    // 🔒 参数一致性检查
    if (currentInit.initialized && 
        currentInit.userId === stableUserId && 
        currentInit.wordbookId === wordbookId) {
      console.log('⏸️ 相同参数已初始化，跳过重复请求');
      return;
    }
    
    try {
      setIsInitializing(true);
      setIsLoading(true);
      
      // 更新初始化状态
      initializationRef.current = {
        userId: stableUserId,
        wordbookId: wordbookId || null,
        initialized: false,
        lastInitTime: now
      };
      
      // 基础检查
      if (!wordbookId) {
        console.error('缺少词书ID');
        navigate('/wordbooks');
        return;
      }
      
      const startTime = Date.now();
      console.log('🚀 开始并行加载学习数据...');
      
      // 🔥 关键优化：并行执行独立的异步操作
      const [savedSessionState, todayPlan, appInstance] = await Promise.all([
        // 组1：检查已保存的学习进度
        studySessionService.loadStudyProgress(user.uid, wordbookId),
        // 组2：获取今日学习计划
        dailyPlanService.getTodayStudyPlan(user.uid, wordbookId),
        // 组3：确保CloudBase连接 + 获取app实例
        ensureLogin().then(() => getApp())
      ]);
      
      if (!todayPlan) {
        console.error('无法获取今日学习计划');
        setMessage({ type: 'error', text: '无法获取学习计划' });
        navigate('/wordbooks');
        return;
      }
      
      // 🔥 优化：只获取前20个单词用于快速启动
      const wordsResult = await appInstance.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit: 20, offset: 0 }
      });
      
      if (!wordsResult.result?.success || !wordsResult.result?.data) {
        console.error('无法获取单词数据:', wordsResult.result?.error);
        setMessage({ type: 'error', text: '无法获取单词数据' });
        navigate('/wordbooks');
        return;
      }
      
      const words = wordsResult.result.data;
      
      // 🔥 创建单词查找映射（合并初始加载和缓存）
      const initialWordsMap = new Map(words.map((word: any) => [word._id, word]));
      const combinedWordsMap = new Map([...initialWordsMap, ...additionalWordsCache]);
      
      // 创建SM-2每日学习会话
      let sm2Session = await createStudySession(user.uid, wordbookId, todayPlan.totalCount);
      let sessionState: StudySessionState | undefined;
      
      // 🔄 如果有保存的进度，尝试恢复
      if (savedSessionState && !savedSessionState.isCompleted) {
        try {
          console.log(`🔄 恢复学习进度: ${savedSessionState.completedCards}/${savedSessionState.totalCards}`);
          
          // 恢复学习会话到之前的状态
          sm2Session = await studySessionService.restoreSession(savedSessionState, sm2Session);
          sessionState = savedSessionState;
          
          setMessage({ 
            type: 'success', 
            text: `📚 已恢复学习进度 (${savedSessionState.completedCards}/${savedSessionState.totalCards})` 
          });
          
          // 自动隐藏提示
          setTimeout(() => setMessage(null), 3000);
          
        } catch (restoreError) {
          console.error('恢复学习进度失败:', restoreError);
          console.log('🆕 将创建新的学习会话');
          // 清除无效的进度数据
          try {
            await studySessionService.clearAllProgress(user.uid, wordbookId);
          } catch (clearError) {
            console.warn('清除进度数据失败:', clearError);
          }
          // 重置会话状态以便创建新的
          sessionState = undefined;
        }
      } else if (savedSessionState?.isCompleted) {
        console.log('✅ 今日学习已完成，清除进度缓存');
        try {
          await studySessionService.clearAllProgress(user.uid, wordbookId);
        } catch (clearError) {
          console.warn('清除完成的进度缓存失败:', clearError);
        }
      }
      
      // 🆕 如果没有恢复成功，创建新的会话状态
      if (!sessionState) {
        sessionState = studySessionService.createSessionState(user.uid, wordbookId, sm2Session);
        console.log('🆕 创建新的学习会话');
      }
      
      // 🔥 获取当前要学习的卡片（支持按需加载）
      const currentSM2Card = sm2Session.getCurrentCard();
      let currentCard = null;
      
      if (currentSM2Card) {
        let originalWord = combinedWordsMap.get(currentSM2Card.wordId);
        
        // 如果当前卡片的单词不在缓存中，尝试按需加载
        if (!originalWord) {
          console.log(`🔄 当前单词 ${currentSM2Card.wordId} 不在缓存中，按需加载...`);
          const updatedWordsMap = await loadMoreWords([currentSM2Card.wordId]);
          originalWord = updatedWordsMap.get(currentSM2Card.wordId);
        }
        
        if (originalWord) {
          currentCard = {
            _id: currentSM2Card.wordId,
            word: originalWord.word,
            meanings: [{
              partOfSpeech: originalWord.pos || 'n.',
              definition: originalWord.meaning || 'No definition available',
              example: originalWord.example || `Example with ${originalWord.word}`,
              translation: originalWord.translation
            }],
            pronunciation: originalWord.phonetic || originalWord.word,
            originalWord: originalWord
          };
        }
      }
      
      // 初始化学习会话
      const newSession: StudySession = {
        plan: todayPlan,
        sm2Session,
        currentCard,
        wordsMap: combinedWordsMap,
        isCompleted: sm2Session.isCompleted(),
        sessionState // 保存会话状态
      };
      
      const totalTime = Date.now() - startTime;
      setSession(newSession);
      
      if (newSession.isCompleted) {
        setMessage({ type: 'success', text: '今日学习目标已完成！' });
        // 清除已完成的进度缓存
        await studySessionService.clearAllProgress(user.uid, wordbookId);
      }
      
      // 标记初始化成功
      initializationRef.current.initialized = true;
      console.log(`✅ 学习会话初始化成功 (耗时: ${totalTime}ms)`);
      
    } catch (error) {
      console.error('初始化学习会话失败:', error);
      
      // 重置初始化状态以允许重试
      initializationRef.current.initialized = false;
      
      // 只有在完全没有可用session时才显示错误
      const hasPartialFunction = session?.currentCard || session?.sm2Session;
      if (!hasPartialFunction) {
        setMessage({ type: 'error', text: '初始化学习会话失败' });
      } else {
        console.log('⚠️ 初始化时有错误，但基本功能可用，继续执行');
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [stableUserId, wordbookId, navigate]); // 移除session依赖避免循环

  // 使用useEffect触发初始化，优化依赖项
  useEffect(() => {
    if (stableUserId && wordbookId) {
      initializeStudySession();
    }
  }, [stableUserId, wordbookId, initializeStudySession]);

  const handleChoice = async (choice: StudyChoice) => {
    if (!session?.currentCard || !user || !session.sm2Session || !session.sessionState) return;
    
    const currentCard = session.currentCard;
    const timestamp = Date.now();
    
    // 1. 使用SM-2会话处理用户选择
    try {
      const updatedSM2Card = session.sm2Session.processChoice(choice);
      
      // 2. 更新会话状态（记录用户选择）
      const updatedSessionState = studySessionService.updateSessionState(
        session.sessionState,
        currentCard._id,
        choice
      );
      
      // 3. 立即保存学习进度（双重保存策略）
      await studySessionService.saveStudyProgress(updatedSessionState);
      console.log(`💾 进度已保存: ${updatedSessionState.completedCards}/${updatedSessionState.totalCards}`);
      
      // 4. 🔥 获取下一张卡片（支持按需加载）
      const nextSM2Card = session.sm2Session.getCurrentCard();
      let nextCard = null;
      
      if (nextSM2Card) {
        let originalWord = session.wordsMap.get(nextSM2Card.wordId);
        
        // 如果下一张卡片的单词不在缓存中，尝试按需加载
        if (!originalWord) {
          console.log(`🔄 下一张卡片单词 ${nextSM2Card.wordId} 不在缓存中，按需加载...`);
          const updatedWordsMap = await loadMoreWords([nextSM2Card.wordId]);
          originalWord = updatedWordsMap.get(nextSM2Card.wordId);
          
          // 同时更新session中的wordsMap
          if (originalWord) {
            session.wordsMap.set(nextSM2Card.wordId, originalWord);
          }
        }
        
        if (originalWord) {
          nextCard = {
            _id: nextSM2Card.wordId,
            word: originalWord.word,
            meanings: [{
              partOfSpeech: originalWord.pos || 'n.',
              definition: originalWord.meaning || 'No definition available',
              example: originalWord.example || `Example with ${originalWord.word}`
            }],
            pronunciation: originalWord.phonetic || originalWord.word,
            originalWord: originalWord
          };
        }
      }
      
      // 5. 更新会话状态
      const sessionStats = session.sm2Session.getSessionStats();
      const isCompleted = session.sm2Session.isCompleted();
      
      const updatedSession = {
        ...session,
        currentCard: nextCard,
        isCompleted,
        sessionState: updatedSessionState, // 更新会话状态
        plan: {
          ...session.plan,
          completedCount: sessionStats.completed,
          stats: {
            ...session.plan.stats,
            knownCount: sessionStats.choiceStats.know,
            unknownCount: sessionStats.choiceStats.unknown,
            hintCount: sessionStats.choiceStats.hint
          }
        }
      };
      
      // 6. 立即更新UI
      setSession(updatedSession);
      
      // 7. 将保存任务加入后台队列（SM2记录保存）
      const saveTask = {
        wordId: currentCard._id,
        choice,
        timestamp
      };
      
      setBackgroundSaveQueue(prev => [...prev, saveTask]);
      
      // 8. 异步执行SM2记录保存（不阻塞UI）
      backgroundSave(saveTask, updatedSM2Card);
      
      // 9. 如果学习完成，清除进度缓存
      if (isCompleted) {
        setMessage({ 
          type: 'success', 
          text: `🎉 恭喜！今日学习目标已完成 (${sessionStats.completed}/${sessionStats.total})` 
        });
        
        // 异步清除已完成的进度缓存
        setTimeout(async () => {
          await studySessionService.clearAllProgress(user.uid, wordbookId!);
          console.log('🗑️ 已清除完成的学习进度缓存');
        }, 1000);
      }
      
    } catch (error) {
      console.error('处理用户选择失败:', error);
      setMessage({ type: 'error', text: '处理选择失败，请重试' });
    }
  };
  
  // 后台保存函数
  const backgroundSave = async (saveTask: {wordId: string, choice: StudyChoice, timestamp: number}, updatedSM2Card: SM2Card) => {
    try {
      // 使用SM-2服务保存学习记录
      await sm2Service.saveSM2Record(updatedSM2Card, user!.uid, wordbookId!);
      
      // 更新学习进度（使用SM-2扩展）
      await dailyPlanService.updateStudyProgress(user!.uid, wordbookId!, {
        wordId: saveTask.wordId,
        isKnown: saveTask.choice === StudyChoice.Know || saveTask.choice === StudyChoice.Hint,
        studyTime: Date.now() - saveTask.timestamp,
        timestamp: new Date(),
        choice: saveTask.choice,
        quality: saveTask.choice === StudyChoice.Know ? 5 : 
                 saveTask.choice === StudyChoice.Hint ? 3 : 1,
        isRepeat: false // 可以根据实际需求设置
      });
      
      // 从队列中移除成功的任务
      setBackgroundSaveQueue(prev => prev.filter(task => 
        task.wordId !== saveTask.wordId || task.timestamp !== saveTask.timestamp
      ));
      
    } catch (error) {
      console.error('后台保存失败:', error);
      // 静默失败，不影响用户体验
      // 可以在这里实现重试逻辑
      setBackgroundSaveQueue(prev => prev.filter(task => 
        task.wordId !== saveTask.wordId || task.timestamp !== saveTask.timestamp
      ));
    }
  };

  const handleRestartSession = async () => {
    if (!user || !wordbookId) return;
    
    try {
      setIsLoading(true);
      
      // 清除所有学习进度缓存
      await studySessionService.clearAllProgress(user.uid, wordbookId);
      console.log('🗑️ 已清除学习进度缓存');
      
      // 重置今日学习计划
      await dailyPlanService.resetTodayPlan(user.uid, wordbookId);
      
      // 重新初始化学习会话
      await initializeStudySession();
      
    } catch (error) {
      console.error('重置学习会话失败:', error);
      setMessage({ type: 'error', text: '重置学习会话失败' });
    }
  };

  const handleBackToWordbooks = () => {
    navigate('/wordbooks', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`text-xl ${TEXT_COLORS.PRIMARY}`}>准备学习材料...</span>
          <div className={`text-sm ${TEXT_COLORS.MUTED} text-center space-y-1`}>
            <p>🔄 并行加载学习数据</p>
            <p>📚 优化加载性能中</p>
            <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className={`text-xl mb-4 ${TEXT_COLORS.PRIMARY}`}>无法加载学习会话</p>
          <button 
            onClick={handleBackToWordbooks}
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition"
          >
            返回词书
          </button>
        </div>
      </div>
    );
  }

  if (session.isCompleted) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen text-center space-y-6 px-6 ${TEXT_COLORS.PRIMARY}`}>
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-semibold tracking-tight">恭喜完成！</h2>
        <div className="text-lg text-gray-400 space-y-2">
          <p>今日学习目标已达成</p>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <p>
              认识：<span className="text-green-400">{session.sm2Session?.getSessionStats().choiceStats.know || 0}</span> 个　　
              提示：<span className="text-yellow-400">{session.sm2Session?.getSessionStats().choiceStats.hint || 0}</span> 个　　
              不认识：<span className="text-red-400">{session.sm2Session?.getSessionStats().choiceStats.unknown || 0}</span> 个
            </p>
            <p>
              准确率：<span className="text-purple-400">{Math.round(session.sm2Session?.getSessionStats().choiceStats.know / Math.max(1, session.sm2Session?.getSessionStats().total || 1) * 100 || 0)}%</span>
            </p>
            <p className="text-sm text-gray-500">
              共学习：{session.sm2Session?.getSessionStats().total || session.plan.totalCount} 个单词
            </p>
            {session.sm2Session?.getSessionStats().choiceStats.unknown > 0 && (
              <p className="text-sm text-yellow-400">
                💡 {session.sm2Session.getSessionStats().choiceStats.unknown} 个困难单词将在稍后重复出现
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={handleRestartSession}
            className="px-6 py-3 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition"
          >
            再来一次
          </button>
          <button 
            onClick={handleBackToWordbooks}
            className="px-6 py-3 rounded-lg text-white font-medium bg-gray-700 hover:bg-gray-600 transition"
          >
            返回词书
          </button>
        </div>
      </div>
    );
  }

    return (
    <>
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* 学习卡片 */}
      {session.currentCard && (
        <StudyCard
          card={session.currentCard}
          showAnswer={false}
          onShowAnswer={() => {}}
          onChoice={handleChoice}
          current={session.sm2Session?.getSessionStats().completed || 0}
          total={session.sm2Session?.getSessionStats().total || session.plan.totalCount}
          onBack={handleBackToWordbooks}
          scheduler={null}
        />
      )}
      
      {/* 后台保存队列指示（仅开发时显示） */}
      {backgroundSaveQueue.length > 0 && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
          后台保存: {backgroundSaveQueue.length}
        </div>
      )}
      
      {/* 🔥 按需加载状态指示 */}
      {isLoadingMoreWords && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">
          🔄 智能加载单词中...
        </div>
      )}
    </>
  );
}