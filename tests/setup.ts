/**
 * 测试环境设置文件
 * 配置全局测试环境和模拟
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// 模拟CloudBase SDK
vi.mock('../src/utils/cloudbase', () => ({
  app: {
    database: () => ({
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ data: [] }),
        add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
        update: vi.fn().mockResolvedValue({ updated: 1 }),
        doc: vi.fn().mockReturnThis()
      }))
    }),
    callFunction: vi.fn().mockResolvedValue({
      result: { success: true, data: [] }
    })
  },
  ensureLogin: vi.fn().mockResolvedValue(true)
}))

// 模拟Date对象以确保测试的可预测性
const mockDate = new Date('2024-01-01T00:00:00Z')
vi.setSystemTime(mockDate)

// 模拟UUID生成
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234'
}))

// 全局测试设置
beforeAll(() => {
  // 测试开始前的全局设置
  console.log('🧪 Starting SM2 Algorithm Test Suite')
})

afterAll(() => {
  // 测试结束后的清理
  console.log('✅ SM2 Algorithm Test Suite Completed')
})

beforeEach(() => {
  // 每个测试前的设置
  vi.clearAllMocks()
})

afterEach(() => {
  // 每个测试后的清理
  vi.restoreAllMocks()
})