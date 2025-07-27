/**
 * 学习会话集成测试
 * 测试真实学习场景下的完整流程
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { DailyStudySession, createSM2Card } from '../../src/utils/sm2Algorithm'
import { SM2Service } from '../../src/services/sm2Service'
import { StudyChoice, SM2Card, SM2CardStatus } from '../../src/types'

describe('学习会话集成测试', () => {
  let fixedDate: Date
  let sm2Service: SM2Service

  beforeEach(() => {
    fixedDate = new Date('2024-01-01T00:00:00Z')
    sm2Service = new SM2Service({ enableCloudSync: false }) // 禁用云同步避免网络调用
  })

  describe('完整学习流程模拟', () => {
    test('新用户首次学习流程', () => {
      // 创建新用户的学习卡片
      const words = ['apple', 'banana', 'cherry', 'date', 'elderberry']
      const cards = words.map(word => createSM2Card(word, fixedDate))
      const session = new DailyStudySession(cards)

      const learningPath: Array<{ word: string, choice: StudyChoice, expectedStatus: SM2CardStatus }> = []

      // 模拟学习过程
      while (!session.isCompleted()) {
        const currentCard = session.getCurrentCard()!
        let choice: StudyChoice
        let expectedStatus: SM2CardStatus

        // 模拟用户的不同反应
        if (currentCard.wordId === 'apple') {
          choice = StudyChoice.Know // 认识
          expectedStatus = SM2CardStatus.Learning
        } else if (currentCard.wordId === 'banana') {
          choice = StudyChoice.Hint // 需要提示
          expectedStatus = SM2CardStatus.Learning
        } else if (currentCard.wordId === 'cherry') {
          choice = StudyChoice.Unknown // 不认识
          expectedStatus = SM2CardStatus.New
        } else {
          choice = StudyChoice.Know // 其他都认识
          expectedStatus = SM2CardStatus.Learning
        }

        const processedCard = session.processChoice(choice, fixedDate)
        learningPath.push({
          word: currentCard.wordId,
          choice,
          expectedStatus
        })

        // 验证处理结果
        expect(processedCard.status).toBe(expectedStatus)
        
        if (choice === StudyChoice.Know) {
          expect(processedCard.repetitions).toBe(1)
          expect(processedCard.interval).toBe(1)
          expect(processedCard.EF).toBeGreaterThanOrEqual(2.5)
        } else if (choice === StudyChoice.Hint) {
          expect(processedCard.repetitions).toBe(1)
          expect(processedCard.EF).toBeLessThan(2.5)
        } else if (choice === StudyChoice.Unknown) {
          expect(processedCard.repetitions).toBe(0)
          expect(processedCard.interval).toBe(1)
        }
      }

      // 验证学习路径
      expect(learningPath).toHaveLength(6) // 5个初始卡片 + 1个重复的cherry
      
      const stats = session.getSessionStats()
      expect(stats.isCompleted).toBe(true)
      expect(stats.choiceStats.know).toBeGreaterThan(0)
      expect(stats.choiceStats.hint).toBeGreaterThan(0)
      expect(stats.choiceStats.unknown).toBe(0) // 重复学习后应该为0
    })

    test('进阶用户的复习流程', () => {
      // 创建已有学习记录的卡片
      const advancedCards: SM2Card[] = [
        {
          ...createSM2Card('advanced1', fixedDate),
          repetitions: 2,
          EF: 2.6,
          interval: 6,
          status: SM2CardStatus.Learning
        },
        {
          ...createSM2Card('advanced2', fixedDate),
          repetitions: 4,
          EF: 2.8,
          interval: 30,
          status: SM2CardStatus.Review
        },
        {
          ...createSM2Card('advanced3', fixedDate),
          repetitions: 1,
          EF: 2.2,
          interval: 1,
          status: SM2CardStatus.Learning
        }
      ]

      const session = new DailyStudySession(advancedCards)
      const results: SM2Card[] = []

      // 模拟复习过程
      while (!session.isCompleted()) {
        const currentCard = session.getCurrentCard()!
        
        // 根据卡片历史表现决定选择
        let choice: StudyChoice
        if (currentCard.EF >= 2.6) {
          choice = StudyChoice.Know // 高EF值的卡片容易记住
        } else if (currentCard.EF >= 2.3) {
          choice = StudyChoice.Hint // 中等EF值需要提示
        } else {
          choice = StudyChoice.Unknown // 低EF值不容易记住
        }

        const result = session.processChoice(choice, fixedDate)
        results.push(result)
      }

      // 验证复习结果
      expect(results).toHaveLength(4) // 3个卡片，其中1个需要重复

      // 验证EF值的变化
      const advanced1Result = results.find(r => r.wordId === 'advanced1')
      const advanced2Result = results.find(r => r.wordId === 'advanced2')
      const advanced3Result = results.find(r => r.wordId === 'advanced3')

      expect(advanced1Result!.EF).toBeGreaterThan(2.6) // Know选择应该增加EF
      expect(advanced2Result!.EF).toBeGreaterThan(2.8) // Know选择应该增加EF
      expect(advanced3Result!.repetitions).toBe(0) // Unknown选择应该重置repetitions
    })
  })

  describe('学习策略测试', () => {
    test('间隔重复效果验证', () => {
      const card = createSM2Card('spaced-test', fixedDate)
      let currentCard = card
      const intervals: number[] = []

      // 模拟连续正确回答
      for (let i = 0; i < 5; i++) {
        currentCard = sm2Service['scheduler'].processReview(
          currentCard,
          StudyChoice.Know,
          new Date(fixedDate.getTime() + i * 24 * 60 * 60 * 1000)
        )
        intervals.push(currentCard.interval)
      }

      // 验证间隔递增模式
      expect(intervals[0]).toBe(1) // 第1次：1天
      expect(intervals[1]).toBe(6) // 第2次：6天
      expect(intervals[2]).toBeGreaterThan(intervals[1]) // 第3次开始按EF增长
      expect(intervals[3]).toBeGreaterThan(intervals[2])
      expect(intervals[4]).toBeGreaterThan(intervals[3])

      // 验证间隔合理性（不应该增长过快）
      for (let i = 1; i < intervals.length; i++) {
        const growth = intervals[i] / intervals[i - 1]
        expect(growth).toBeLessThan(5) // 增长倍数不应该过大
      }
    })

    test('困难单词处理策略', () => {
      const difficultCard = createSM2Card('difficult-word', fixedDate)
      let currentCard = difficultCard

      // 模拟学习困难的单词：交替正确和错误
      const choices = [
        StudyChoice.Unknown, // 第1次不认识
        StudyChoice.Hint,    // 第2次需要提示
        StudyChoice.Know,    // 第3次认识
        StudyChoice.Unknown, // 第4次又忘了
        StudyChoice.Hint,    // 第5次需要提示
        StudyChoice.Know     // 第6次认识
      ]

      const results: SM2Card[] = []
      choices.forEach((choice, index) => {
        currentCard = sm2Service['scheduler'].processReview(
          currentCard,
          choice,
          new Date(fixedDate.getTime() + index * 24 * 60 * 60 * 1000)
        )
        results.push({ ...currentCard })
      })

      // 验证困难单词的学习轨迹
      expect(results[0].repetitions).toBe(0) // Unknown重置
      expect(results[1].repetitions).toBe(1) // Hint增加
      expect(results[2].repetitions).toBe(2) // Know增加
      expect(results[3].repetitions).toBe(0) // Unknown重置
      expect(results[4].repetitions).toBe(1) // Hint增加
      expect(results[5].repetitions).toBe(2) // Know增加

      // 验证EF值下降（困难单词）
      expect(results[5].EF).toBeLessThan(2.5) // 应该比初始值低
    })

    test('掌握程度进展验证', () => {
      const card = createSM2Card('mastery-test', fixedDate)
      let currentCard = card
      const masteryLevels: number[] = []

      // 记录初始掌握程度
      masteryLevels.push(sm2Service['scheduler'].getMasteryLevel(currentCard))

      // 模拟逐步掌握过程
      for (let i = 0; i < 8; i++) {
        currentCard = sm2Service['scheduler'].processReview(
          currentCard,
          StudyChoice.Know,
          new Date(fixedDate.getTime() + i * 24 * 60 * 60 * 1000)
        )
        masteryLevels.push(sm2Service['scheduler'].getMasteryLevel(currentCard))
      }

      // 验证掌握程度递增
      for (let i = 1; i < masteryLevels.length; i++) {
        expect(masteryLevels[i]).toBeGreaterThanOrEqual(masteryLevels[i - 1])
      }

      // 验证状态转换
      expect(currentCard.status).toBe(SM2CardStatus.Mastered)
      expect(masteryLevels[masteryLevels.length - 1]).toBe(100)
    })
  })

  describe('批量学习场景', () => {
    test('大量单词的学习会话', () => {
      // 创建100个单词的学习卡片
      const largeWordSet = Array.from({ length: 100 }, (_, i) => 
        createSM2Card(`word${i + 1}`, fixedDate)
      )
      const session = new DailyStudySession(largeWordSet)

      const batchStats = {
        totalProcessed: 0,
        knowCount: 0,
        hintCount: 0,
        unknownCount: 0,
        maxRepeatQueueSize: 0
      }

      // 模拟随机学习模式
      while (!session.isCompleted() && batchStats.totalProcessed < 200) { // 限制避免无限循环
        const currentCard = session.getCurrentCard()!
        
        // 随机选择（模拟真实用户行为）
        const rand = Math.random()
        let choice: StudyChoice
        if (rand < 0.6) {
          choice = StudyChoice.Know
          batchStats.knowCount++
        } else if (rand < 0.8) {
          choice = StudyChoice.Hint
          batchStats.hintCount++
        } else {
          choice = StudyChoice.Unknown
          batchStats.unknownCount++
        }

        session.processChoice(choice, fixedDate)
        batchStats.totalProcessed++

        // 跟踪重复队列大小
        const stats = session.getSessionStats()
        const repeatQueueSize = stats.total - stats.completed - (stats.remaining - (stats.total - stats.completed))
        batchStats.maxRepeatQueueSize = Math.max(batchStats.maxRepeatQueueSize, repeatQueueSize)
      }

      // 验证批量学习结果
      expect(batchStats.totalProcessed).toBeGreaterThan(100) // 应该有重复学习
      expect(batchStats.knowCount + batchStats.hintCount + batchStats.unknownCount)
        .toBe(batchStats.totalProcessed)

      const finalStats = session.getSessionStats()
      if (session.isCompleted()) {
        expect(finalStats.isCompleted).toBe(true)
        expect(finalStats.remaining).toBe(0)
      }
    })
  })

  describe('边界条件测试', () => {
    test('空学习会话', () => {
      const emptySession = new DailyStudySession([])
      
      expect(emptySession.getCurrentCard()).toBeNull()
      expect(emptySession.isCompleted()).toBe(true)
      
      const stats = emptySession.getSessionStats()
      expect(stats.total).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.isCompleted).toBe(true)
    })

    test('单卡片学习会话', () => {
      const singleCard = createSM2Card('single-word', fixedDate)
      const session = new DailyStudySession([singleCard])
      
      expect(session.getCurrentCard()?.wordId).toBe('single-word')
      expect(session.isCompleted()).toBe(false)
      
      // 完成学习
      session.processChoice(StudyChoice.Know, fixedDate)
      
      expect(session.getCurrentCard()).toBeNull()
      expect(session.isCompleted()).toBe(true)
      
      const stats = session.getSessionStats()
      expect(stats.total).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.completionRate).toBe(100)
    })

    test('全部不认识的极端情况', () => {
      const cards = Array.from({ length: 5 }, (_, i) => 
        createSM2Card(`unknown${i + 1}`, fixedDate)
      )
      const session = new DailyStudySession(cards)
      
      let iterationCount = 0
      const maxIterations = 20 // 防止无限循环
      
      // 第一轮：全部选择不认识
      while (!session.isCompleted() && iterationCount < maxIterations) {
        const currentCard = session.getCurrentCard()
        if (!currentCard) break
        
        // 如果是第一次遇到这个单词，选择不认识；如果是重复，选择认识
        const choice = currentCard.repetitions === 0 ? StudyChoice.Unknown : StudyChoice.Know
        session.processChoice(choice, fixedDate)
        iterationCount++
      }
      
      expect(session.isCompleted()).toBe(true)
      expect(iterationCount).toBe(10) // 5个初始 + 5个重复
      
      const stats = session.getSessionStats()
      expect(stats.total).toBe(5)
      expect(stats.completed).toBe(5)
    })
  })

  describe('性能测试', () => {
    test('大规模学习会话性能', () => {
      const startTime = Date.now()
      
      // 创建1000个单词
      const massiveWordSet = Array.from({ length: 1000 }, (_, i) => 
        createSM2Card(`perf_word${i + 1}`, fixedDate)
      )
      
      const creationTime = Date.now() - startTime
      expect(creationTime).toBeLessThan(1000) // 创建1000个卡片应该在1秒内完成
      
      const session = new DailyStudySession(massiveWordSet)
      const sessionStartTime = Date.now()
      
      // 快速完成前100个单词
      let processedCount = 0
      while (!session.isCompleted() && processedCount < 100) {
        session.processChoice(StudyChoice.Know, fixedDate)
        processedCount++
      }
      
      const processingTime = Date.now() - sessionStartTime
      expect(processingTime).toBeLessThan(1000) // 处理100个单词应该在1秒内完成
      
      const stats = session.getSessionStats()
      expect(stats.completed).toBe(100)
      expect(stats.remaining).toBe(900)
    })
  })
})