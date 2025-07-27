/**
 * SM2算法核心逻辑单元测试
 * 测试SM2算法的所有核心功能和边界条件
 */

import { describe, test, expect, beforeEach } from 'vitest'
import {
  SM2Scheduler,
  DailyStudySession,
  SM2Card,
  SM2CardStatus,
  StudyChoice,
  QUALITY_MAPPING,
  createSM2Card,
  processSM2Review,
  isSM2CardDue,
  getSM2MasteryLevel
} from '../../../src/utils/sm2Algorithm'

describe('SM2Algorithm Core Logic', () => {
  let scheduler: SM2Scheduler
  let fixedDate: Date

  beforeEach(() => {
    scheduler = new SM2Scheduler()
    fixedDate = new Date('2024-01-01T00:00:00Z')
  })

  describe('SM2Scheduler - 卡片初始化', () => {
    test('应该正确初始化新卡片', () => {
      const wordId = 'test-word-1'
      const card = scheduler.initCard(wordId, fixedDate)

      expect(card).toEqual({
        wordId: 'test-word-1',
        repetitions: 0,
        EF: 2.5, // 初始EF值
        interval: 0,
        nextReview: fixedDate,
        status: SM2CardStatus.New,
        createdAt: fixedDate
      })
    })

    test('便捷函数应该正确创建卡片', () => {
      const card = createSM2Card('test-word-2', fixedDate)
      expect(card.wordId).toBe('test-word-2')
      expect(card.EF).toBe(2.5)
      expect(card.status).toBe(SM2CardStatus.New)
    })
  })

  describe('SM2Scheduler - EF值计算', () => {
    test('应该按SuperMemo2公式正确计算EF值', () => {
      // 测试公式: EF = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
      const currentEF = 2.5
      
      // 质量=5 (知道): EF = 2.5 + (0.1 - 0*0.08) = 2.6
      const ef1 = scheduler['calculateNewEF'](currentEF, 5)
      expect(ef1).toBeCloseTo(2.6, 2)
      
      // 质量=3 (提示): EF = 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.36
      const ef2 = scheduler['calculateNewEF'](currentEF, 3)
      expect(ef2).toBeCloseTo(2.36, 2)
      
      // 质量=1 (不知道): EF = 2.5 + (0.1 - 4*(0.08+4*0.02)) = 1.96  
      const ef3 = scheduler['calculateNewEF'](currentEF, 1)
      expect(ef3).toBeCloseTo(1.96, 2)
    })

    test('EF值不应该低于最小值1.3', () => {
      const lowEF = 1.5
      const newEF = scheduler['calculateNewEF'](lowEF, 1) // 很低的质量评分
      expect(newEF).toBeGreaterThanOrEqual(1.3)
    })
  })

  describe('SM2Scheduler - 间隔调度', () => {
    test('第一次复习间隔应该是1天', () => {
      const card = scheduler.initCard('test', fixedDate)
      const updatedCard = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      
      expect(updatedCard.repetitions).toBe(1)
      expect(updatedCard.interval).toBe(1)
      
      const expectedNextReview = new Date(fixedDate.getTime() + 24 * 60 * 60 * 1000)
      expect(updatedCard.nextReview).toEqual(expectedNextReview)
    })

    test('第二次复习间隔应该是6天', () => {
      const card = scheduler.initCard('test', fixedDate)
      
      // 第一次复习（知道）
      const card1 = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      expect(card1.interval).toBe(1)
      
      // 第二次复习（知道）
      const reviewDate2 = new Date(fixedDate.getTime() + 24 * 60 * 60 * 1000)
      const card2 = scheduler.processReview(card1, StudyChoice.Know, reviewDate2)
      
      expect(card2.repetitions).toBe(2)
      expect(card2.interval).toBe(6)
    })

    test('第三次及以后复习间隔应该按EF倍数计算', () => {
      let card = scheduler.initCard('test', fixedDate)
      
      // 连续两次"知道"
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      
      expect(card.interval).toBe(6)
      const originalEF = card.EF
      
      // 第三次复习
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      
      expect(card.repetitions).toBe(3)
      // 第三次复习应该使用更新后的EF值，而不是原始EF值
      expect(card.interval).toBeGreaterThan(6) // 至少比6天大
      expect(card.interval).toBeLessThan(30)   // 但不会太大
    })
  })

  describe('SM2Scheduler - 复习失败处理', () => {
    test('选择"不知道"应该重置复习进度', () => {
      let card = scheduler.initCard('test', fixedDate)
      
      // 先进行几次成功复习
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      
      expect(card.repetitions).toBe(2)
      expect(card.interval).toBe(6)
      
      // 选择"不知道"
      card = scheduler.processReview(card, StudyChoice.Unknown, fixedDate)
      
      expect(card.repetitions).toBe(0) // 重置为0
      expect(card.interval).toBe(1)    // 重置为1天
      
      const expectedNextReview = new Date(fixedDate.getTime() + 24 * 60 * 60 * 1000)
      expect(card.nextReview).toEqual(expectedNextReview)
    })
  })

  describe('SM2Scheduler - 卡片状态管理', () => {
    test('应该正确更新卡片状态', () => {
      let card = scheduler.initCard('test', fixedDate)
      
      // 新卡片状态 (初始掌握程度应该根据状态计算)
      expect(scheduler.getMasteryLevel(card)).toBeGreaterThanOrEqual(0)
      
      // 第一次复习 -> Learning
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      expect(card.status).toBe(SM2CardStatus.Learning)
      
      // 第二次复习 -> 仍然Learning
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      expect(card.status).toBe(SM2CardStatus.Learning)
      
      // 第三次复习 -> Review
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      expect(card.status).toBe(SM2CardStatus.Review)
      
      // 继续复习直到Mastered
      for (let i = 0; i < 3; i++) {
        card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      }
      expect(card.status).toBe(SM2CardStatus.Mastered)
    })
  })

  describe('SM2Scheduler - 卡片到期检查', () => {
    test('应该正确判断卡片是否到期', () => {
      const card = scheduler.initCard('test', fixedDate)
      
      // 新卡片应该立即到期
      expect(scheduler.isDue(card, fixedDate)).toBe(true)
      
      // 复习后设置未来日期
      const reviewedCard = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      const futureDate = new Date(fixedDate.getTime() + 2 * 24 * 60 * 60 * 1000) // 2天后
      
      expect(scheduler.isDue(reviewedCard, fixedDate)).toBe(false) // 还没到期
      expect(scheduler.isDue(reviewedCard, futureDate)).toBe(true) // 已经到期
    })

    test('便捷函数应该正确工作', () => {
      const card = createSM2Card('test', fixedDate)
      expect(isSM2CardDue(card, fixedDate)).toBe(true)
    })
  })

  describe('SM2Scheduler - 掌握程度计算', () => {
    test('应该根据状态和EF正确计算掌握程度', () => {
      // 新卡片 (包含EF bonus)
      const newCard = scheduler.initCard('test', fixedDate)
      const newLevel = scheduler.getMasteryLevel(newCard)
      expect(newLevel).toBeGreaterThanOrEqual(0)
      expect(newLevel).toBeLessThan(25)
      
      // Learning卡片
      let card = scheduler.processReview(newCard, StudyChoice.Know, fixedDate)
      const learningLevel = scheduler.getMasteryLevel(card)
      expect(learningLevel).toBeGreaterThanOrEqual(25)
      expect(learningLevel).toBeLessThan(60)
      
      // Review卡片
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      const reviewLevel = scheduler.getMasteryLevel(card)
      expect(reviewLevel).toBeGreaterThanOrEqual(60)
      expect(reviewLevel).toBeLessThan(100)
      
      // Mastered卡片
      for (let i = 0; i < 10; i++) {
        card = scheduler.processReview(card, StudyChoice.Know, fixedDate)
      }
      const masteredLevel = scheduler.getMasteryLevel(card)
      expect(masteredLevel).toBe(100)
    })

    test('便捷函数应该正确工作', () => {
      const card = createSM2Card('test', fixedDate)
      const level = getSM2MasteryLevel(card)
      expect(level).toBeGreaterThanOrEqual(0)
      expect(level).toBeLessThan(25)
    })
  })

  describe('SM2Scheduler - 难度标签', () => {
    test('应该根据EF值返回正确的难度标签', () => {
      const highEFCard = { ...scheduler.initCard('test', fixedDate), EF: 3.0 }
      expect(scheduler.getDifficultyLabel(highEFCard)).toBe('简单')
      
      const mediumEFCard = { ...scheduler.initCard('test', fixedDate), EF: 2.5 }
      expect(scheduler.getDifficultyLabel(mediumEFCard)).toBe('一般')
      
      const lowEFCard = { ...scheduler.initCard('test', fixedDate), EF: 2.0 }
      expect(scheduler.getDifficultyLabel(lowEFCard)).toBe('困难')
      
      const veryLowEFCard = { ...scheduler.initCard('test', fixedDate), EF: 1.5 }
      expect(scheduler.getDifficultyLabel(veryLowEFCard)).toBe('非常困难')
    })
  })

  describe('StudyChoice 质量映射', () => {
    test('应该正确映射学习选择到质量评分', () => {
      expect(QUALITY_MAPPING[StudyChoice.Know]).toBe(5)
      expect(QUALITY_MAPPING[StudyChoice.Hint]).toBe(3)
      expect(QUALITY_MAPPING[StudyChoice.Unknown]).toBe(1)
    })
  })

  describe('便捷函数集成测试', () => {
    test('processSM2Review应该正确处理复习', () => {
      const card = createSM2Card('test', fixedDate)
      const reviewedCard = processSM2Review(card, StudyChoice.Know, fixedDate)
      
      expect(reviewedCard.repetitions).toBe(1)
      expect(reviewedCard.interval).toBe(1)
      expect(reviewedCard.status).toBe(SM2CardStatus.Learning)
    })
  })
})

describe('DailyStudySession - 每日学习会话', () => {
  let cards: SM2Card[]
  let session: DailyStudySession
  let fixedDate: Date

  beforeEach(() => {
    fixedDate = new Date('2024-01-01T00:00:00Z')
    cards = [
      createSM2Card('word1', fixedDate),
      createSM2Card('word2', fixedDate),
      createSM2Card('word3', fixedDate)
    ]
    session = new DailyStudySession(cards)
  })

  describe('会话初始化', () => {
    test('应该正确初始化学习会话', () => {
      expect(session.getCurrentCard()).toBeTruthy()
      expect(session.getCurrentCard()?.wordId).toBe('word1')
      expect(session.isCompleted()).toBe(false)
    })
  })

  describe('学习选择处理', () => {
    test('选择"知道"应该直接完成卡片', () => {
      const initialCard = session.getCurrentCard()!
      const processedCard = session.processChoice(StudyChoice.Know, fixedDate)
      
      expect(processedCard.repetitions).toBe(1)
      expect(session.getCurrentCard()?.wordId).toBe('word2') // 移动到下一张
    })

    test('选择"不知道"应该将卡片加入重复队列', () => {
      session.processChoice(StudyChoice.Unknown, fixedDate)
      
      // 处理完所有初始卡片
      session.processChoice(StudyChoice.Know, fixedDate)
      session.processChoice(StudyChoice.Know, fixedDate)
      
      // 应该还有重复队列中的卡片
      expect(session.isCompleted()).toBe(false)
      expect(session.getCurrentCard()?.wordId).toBe('word1') // 回到不认识的卡片
    })

    test('选择"提示"应该完成卡片但记录为需要提示', () => {
      const processedCard = session.processChoice(StudyChoice.Hint, fixedDate)
      
      expect(processedCard.repetitions).toBe(1)
      expect(processedCard.EF).toBeLessThan(2.5) // EF应该降低
      expect(session.getCurrentCard()?.wordId).toBe('word2')
    })
  })

  describe('会话统计', () => {
    test('应该正确计算会话统计', () => {
      const initialStats = session.getSessionStats()
      expect(initialStats.total).toBe(3)
      expect(initialStats.completed).toBe(0)
      expect(initialStats.remaining).toBe(3)
      expect(initialStats.completionRate).toBe(0)
      
      // 完成一张卡片
      session.processChoice(StudyChoice.Know, fixedDate)
      
      const updatedStats = session.getSessionStats()
      expect(updatedStats.completed).toBe(1)
      expect(updatedStats.remaining).toBe(2)
      expect(updatedStats.completionRate).toBeCloseTo(33.33, 1)
    })

    test('应该正确统计不同选择类型', () => {
      session.processChoice(StudyChoice.Know, fixedDate)
      session.processChoice(StudyChoice.Hint, fixedDate)
      session.processChoice(StudyChoice.Unknown, fixedDate)
      
      // 处理重复队列中的卡片
      session.processChoice(StudyChoice.Know, fixedDate)
      
      const stats = session.getSessionStats()
      expect(stats.choiceStats.know).toBeGreaterThan(0)
      expect(stats.choiceStats.hint).toBeGreaterThan(0)
    })
  })

  describe('会话完成', () => {
    test('完成所有卡片后会话应该标记为完成', () => {
      session.processChoice(StudyChoice.Know, fixedDate)
      session.processChoice(StudyChoice.Know, fixedDate)
      session.processChoice(StudyChoice.Know, fixedDate)
      
      expect(session.isCompleted()).toBe(true)
      expect(session.getCurrentCard()).toBeNull()
    })
  })

  describe('错误处理', () => {
    test('没有可学习卡片时应该抛出错误', () => {
      // 先完成所有卡片
      while (!session.isCompleted()) {
        session.processChoice(StudyChoice.Know, fixedDate)
      }
      
      expect(() => {
        session.processChoice(StudyChoice.Know, fixedDate)
      }).toThrow('没有可学习的卡片')
    })
  })
})