/**
 * SM2服务层测试
 * 测试SM2Service类的所有功能和数据转换
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { SM2Service } from '../../../src/services/sm2Service'
import { SM2Card, SM2CardStatus, StudyChoice, StudyRecord } from '../../../src/types'
import { createSM2Card } from '../../../src/utils/sm2Algorithm'

// 模拟类型定义
interface MockStudyRecord extends Partial<StudyRecord> {
  uid: string
  wordId: string
  wordbookId: string
  status: 'new' | 'learning' | 'review' | 'graduated'
  stage?: number
  successes?: number
  failures?: number
  nextReview: Date
  createdAt: Date
  updatedAt?: Date
  sm2Card?: SM2Card
  repetitions?: number
  EF?: number
  interval?: number
  algorithm?: string
}

describe('SM2Service', () => {
  let sm2Service: SM2Service
  let fixedDate: Date
  let mockCard: SM2Card
  let mockRecord: MockStudyRecord

  beforeEach(() => {
    sm2Service = new SM2Service()
    fixedDate = new Date('2024-01-01T00:00:00Z')
    
    mockCard = createSM2Card('test-word', fixedDate)
    
    mockRecord = {
      uid: 'test-user',
      wordId: 'test-word',
      wordbookId: 'test-wordbook',
      status: 'new',
      stage: 0,
      successes: 0,
      failures: 0,
      nextReview: fixedDate,
      createdAt: fixedDate
    }
  })

  describe('数据格式转换', () => {
    describe('convertToSM2Card', () => {
      test('应该正确转换包含SM2Card的记录', () => {
        const recordWithSM2 = {
          ...mockRecord,
          sm2Card: mockCard
        }
        
        const result = sm2Service.convertToSM2Card(recordWithSM2 as StudyRecord)
        expect(result).toEqual(mockCard)
      })

      test('应该从StudyRecord字段构建SM2Card', () => {
        const recordWithFields = {
          ...mockRecord,
          repetitions: 2,
          EF: 2.3,
          interval: 6
        }
        
        const result = sm2Service.convertToSM2Card(recordWithFields as StudyRecord)
        
        expect(result.wordId).toBe('test-word')
        expect(result.repetitions).toBe(2)
        expect(result.EF).toBe(2.3)
        expect(result.interval).toBe(6)
        expect(result.status).toBe(SM2CardStatus.New)
      })

      test('应该从传统记录迁移到SM2格式', () => {
        const legacyRecord = {
          ...mockRecord,
          stage: 3,
          successes: 4,
          failures: 1
        }
        
        const result = sm2Service.convertToSM2Card(legacyRecord as StudyRecord)
        
        expect(result.wordId).toBe('test-word')
        expect(result.repetitions).toBe(4) // 基于successes
        expect(result.EF).toBeGreaterThanOrEqual(1.3)
        expect(result.EF).toBeLessThanOrEqual(3.0)
        expect(result.interval).toBeGreaterThan(0)
      })
    })

    describe('convertToStudyRecord', () => {
      test('应该正确转换SM2Card到StudyRecord', () => {
        const result = sm2Service.convertToStudyRecord(
          mockCard, 
          'test-user', 
          'test-wordbook'
        )
        
        expect(result.uid).toBe('test-user')
        expect(result.wordId).toBe('test-word')
        expect(result.wordbookId).toBe('test-wordbook')
        expect(result.sm2Card).toEqual(mockCard)
        expect(result.repetitions).toBe(mockCard.repetitions)
        expect(result.EF).toBe(mockCard.EF)
        expect(result.interval).toBe(mockCard.interval)
        expect(result.algorithm).toBe('sm2')
      })

      test('应该正确映射SM2状态到传统状态', () => {
        const learningCard = { ...mockCard, status: SM2CardStatus.Learning }
        const reviewCard = { ...mockCard, status: SM2CardStatus.Review }
        const masteredCard = { ...mockCard, status: SM2CardStatus.Mastered }
        
        const learningRecord = sm2Service.convertToStudyRecord(learningCard, 'uid', 'wid')
        const reviewRecord = sm2Service.convertToStudyRecord(reviewCard, 'uid', 'wid')
        const masteredRecord = sm2Service.convertToStudyRecord(masteredCard, 'uid', 'wid')
        
        expect(learningRecord.status).toBe('learning')
        expect(reviewRecord.status).toBe('review')
        expect(masteredRecord.status).toBe('graduated')
      })
    })
  })

  describe('状态映射', () => {
    test('应该正确映射传统状态到SM2状态', () => {
      const mapMethod = sm2Service['mapStatusToSM2Status'].bind(sm2Service)
      
      expect(mapMethod('new')).toBe(SM2CardStatus.New)
      expect(mapMethod('learning')).toBe(SM2CardStatus.Learning)
      expect(mapMethod('review')).toBe(SM2CardStatus.Review)
      expect(mapMethod('graduated')).toBe(SM2CardStatus.Mastered)
      expect(mapMethod('unknown')).toBe(SM2CardStatus.New) // 默认值
    })

    test('应该正确映射SM2状态到传统状态', () => {
      const mapMethod = sm2Service['mapSM2StatusToStatus'].bind(sm2Service)
      
      expect(mapMethod(SM2CardStatus.New)).toBe('new')
      expect(mapMethod(SM2CardStatus.Learning)).toBe('learning')
      expect(mapMethod(SM2CardStatus.Review)).toBe('review')
      expect(mapMethod(SM2CardStatus.Mastered)).toBe('graduated')
    })

    test('应该正确映射SM2状态到stage', () => {
      const mapMethod = sm2Service['mapSM2StatusToStage'].bind(sm2Service)
      
      expect(mapMethod(SM2CardStatus.New)).toBe(0)
      expect(mapMethod(SM2CardStatus.Learning)).toBe(1)
      expect(mapMethod(SM2CardStatus.Review)).toBe(3)
      expect(mapMethod(SM2CardStatus.Mastered)).toBe(6)
    })
  })

  describe('数组分块工具', () => {
    test('应该正确分块数组', () => {
      const chunkMethod = sm2Service['chunkArray'].bind(sm2Service)
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      
      const chunks = chunkMethod(array, 3)
      
      expect(chunks).toHaveLength(4)
      expect(chunks[0]).toEqual([1, 2, 3])
      expect(chunks[1]).toEqual([4, 5, 6])
      expect(chunks[2]).toEqual([7, 8, 9])
      expect(chunks[3]).toEqual([10])
    })

    test('应该处理空数组', () => {
      const chunkMethod = sm2Service['chunkArray'].bind(sm2Service)
      const chunks = chunkMethod([], 3)
      expect(chunks).toEqual([])
    })
  })

  describe('传统记录迁移', () => {
    test('应该正确从传统记录迁移', () => {
      const migrateMethod = sm2Service['migrateFromLegacyRecord'].bind(sm2Service)
      
      const legacyRecord = {
        wordId: 'migrate-word',
        stage: 2,
        successes: 3,
        failures: 1,
        status: 'learning',
        nextReview: fixedDate,
        createdAt: fixedDate
      } as StudyRecord
      
      const result = migrateMethod(legacyRecord)
      
      expect(result.wordId).toBe('migrate-word')
      expect(result.repetitions).toBe(3)
      expect(result.EF).toBeGreaterThanOrEqual(1.3)
      expect(result.interval).toBeGreaterThan(0)
      expect(result.status).toBe(SM2CardStatus.Learning)
    })

    test('迁移后的EF值应该在合理范围内', () => {
      const migrateMethod = sm2Service['migrateFromLegacyRecord'].bind(sm2Service)
      
      // 高成功率记录
      const highSuccessRecord = {
        wordId: 'high-success',
        successes: 10,
        failures: 1,
        status: 'review',
        nextReview: fixedDate,
        createdAt: fixedDate
      } as StudyRecord
      
      const highResult = migrateMethod(highSuccessRecord)
      expect(highResult.EF).toBeGreaterThan(2.5)
      
      // 低成功率记录
      const lowSuccessRecord = {
        wordId: 'low-success',
        successes: 1,
        failures: 10,
        status: 'learning',
        nextReview: fixedDate,
        createdAt: fixedDate
      } as StudyRecord
      
      const lowResult = migrateMethod(lowSuccessRecord)
      expect(lowResult.EF).toBeLessThan(2.0)
      expect(lowResult.EF).toBeGreaterThanOrEqual(1.3) // 不低于最小值
    })
  })

  describe('配置选项', () => {
    test('应该使用默认配置', () => {
      const defaultService = new SM2Service()
      expect(defaultService['config'].enableCloudSync).toBe(true)
      expect(defaultService['config'].batchSize).toBe(50)
      expect(defaultService['config'].retryAttempts).toBe(3)
    })

    test('应该合并自定义配置', () => {
      const customService = new SM2Service({
        enableCloudSync: false,
        batchSize: 100
        // retryAttempts应该使用默认值
      })
      
      expect(customService['config'].enableCloudSync).toBe(false)
      expect(customService['config'].batchSize).toBe(100)
      expect(customService['config'].retryAttempts).toBe(3) // 默认值
    })
  })

  describe('错误处理', () => {
    test('应该处理无效的状态映射', () => {
      const mapMethod = sm2Service['mapStatusToSM2Status'].bind(sm2Service)
      // 传入无效状态应该返回默认值
      expect(mapMethod('invalid-status' as any)).toBe(SM2CardStatus.New)
    })

    test('应该处理缺失字段的记录', () => {
      const incompleteRecord = {
        wordId: 'incomplete',
        // 缺少很多必需字段
        nextReview: fixedDate,
        createdAt: fixedDate
      } as StudyRecord
      
      const result = sm2Service.convertToSM2Card(incompleteRecord)
      
      expect(result.wordId).toBe('incomplete')
      expect(result.repetitions).toBeGreaterThanOrEqual(0)
      expect(result.EF).toBeGreaterThanOrEqual(1.3)
      expect(result.status).toBe(SM2CardStatus.New)
    })
  })

  describe('算法一致性', () => {
    test('服务层处理的结果应该与核心算法一致', () => {
      const card = createSM2Card('consistency-test', fixedDate)
      
      // 使用核心算法处理
      const coreResult = sm2Service['scheduler'].processReview(
        card, 
        StudyChoice.Know, 
        fixedDate
      )
      
      // 转换为记录再转换回卡片，应该保持一致
      const record = sm2Service.convertToStudyRecord(coreResult, 'uid', 'wid')
      const convertedCard = sm2Service.convertToSM2Card(record)
      
      expect(convertedCard.repetitions).toBe(coreResult.repetitions)
      expect(convertedCard.EF).toBeCloseTo(coreResult.EF, 5)
      expect(convertedCard.interval).toBe(coreResult.interval)
      expect(convertedCard.status).toBe(coreResult.status)
    })
  })
})