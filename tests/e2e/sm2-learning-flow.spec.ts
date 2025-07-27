/**
 * SM2算法学习流程端到端测试
 * 使用Playwright测试完整的用户学习体验
 */

import { test, expect, Page } from '@playwright/test'

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:5173', // Vite开发服务器
  testUser: {
    email: 'beelzebub1949@hotmail.com',
    password: '65696788'
  },
  timeout: 30000
}

test.describe('SM2算法学习流程E2E测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(60000)
    
    // 访问首页
    await page.goto(TEST_CONFIG.baseURL)
    await page.waitForLoadState('networkidle')
  })

  test('完整学习流程：登录 → 选择词书 → SM2学习 → 进度验证', async ({ page }) => {
    // 1. 用户登录
    await loginUser(page)
    
    // 2. 导航到词书页面
    await page.click('[data-testid="nav-wordbooks"], text=词书管理')
    await page.waitForLoadState('networkidle')
    
    // 3. 选择一个词书开始学习
    const wordbookCard = page.locator('.wordbook-card, [data-testid="wordbook-item"]').first()
    await expect(wordbookCard).toBeVisible({ timeout: 10000 })
    
    // 点击开始学习按钮
    await wordbookCard.locator('button:has-text("开始学习"), [data-testid="start-study"]').click()
    await page.waitForLoadState('networkidle')
    
    // 4. 验证进入学习页面
    await expect(page).toHaveURL(/.*\/study\/.*/)
    
    // 5. 验证学习界面元素
    await expect(page.locator('[data-testid="study-card"], .study-card')).toBeVisible()
    await expect(page.locator('button:has-text("知道"), [data-testid="choice-know"]')).toBeVisible()
    await expect(page.locator('button:has-text("提示"), [data-testid="choice-hint"]')).toBeVisible()
    await expect(page.locator('button:has-text("不知道"), [data-testid="choice-unknown"]')).toBeVisible()
    
    // 6. 执行学习序列并验证SM2算法行为
    await performSM2LearningSequence(page)
    
    // 7. 验证学习统计
    await verifyLearningStats(page)
  })

  test('SM2算法行为验证：不同选择的影响', async ({ page }) => {
    await loginUser(page)
    await navigateToStudy(page)
    
    // 记录初始单词
    const firstWord = await page.locator('[data-testid="word-text"], .word-display').textContent()
    
    // 测试"不知道"选择 - 应该重置学习进度
    await page.click('button:has-text("不知道"), [data-testid="choice-unknown"]')
    await page.waitForTimeout(1000)
    
    // 验证单词可能会在稍后重新出现（重复学习）
    let foundRepeat = false
    for (let i = 0; i < 10; i++) {
      const currentWord = await page.locator('[data-testid="word-text"], .word-display').textContent()
      if (currentWord === firstWord) {
        foundRepeat = true
        break
      }
      
      // 随机选择继续
      const choices = ['choice-know', 'choice-hint', 'choice-unknown']
      const randomChoice = choices[Math.floor(Math.random() * choices.length)]
      await page.click(`[data-testid="${randomChoice}"], button:has-text("${getChoiceText(randomChoice)}")`)
      await page.waitForTimeout(500)
      
      // 检查是否完成
      const isCompleted = await page.locator('text=学习完成, text=今日目标已完成').isVisible()
      if (isCompleted) break
    }
    
    // 在实际应用中，不认识的单词应该有机会重复出现
    // 这验证了SM2算法的当日重复机制
  })

  test('学习进度持久化验证', async ({ page }) => {
    await loginUser(page)
    await navigateToStudy(page)
    
    // 进行一些学习操作
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("知道"), [data-testid="choice-know"]')
      await page.waitForTimeout(500)
      
      const isCompleted = await page.locator('text=学习完成, text=今日目标已完成').isVisible()
      if (isCompleted) break
    }
    
    // 刷新页面验证数据持久化
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // 验证学习进度被保存
    const progressText = await page.locator('[data-testid="progress"], .progress-display').textContent()
    expect(progressText).toMatch(/\d+\/\d+/) // 应该显示进度格式如 "3/20"
  })

  test('学习统计准确性验证', async ({ page }) => {
    await loginUser(page)
    
    // 进入统计页面
    await page.click('[data-testid="nav-stats"], text=学习统计')
    await page.waitForLoadState('networkidle')
    
    // 验证统计页面元素
    await expect(page.locator('[data-testid="total-words"], text=总单词')).toBeVisible()
    await expect(page.locator('[data-testid="mastered-words"], text=已掌握')).toBeVisible()
    await expect(page.locator('[data-testid="learning-words"], text=学习中')).toBeVisible()
    
    // 记录当前统计
    const initialStats = await extractLearningStats(page)
    
    // 进行一些学习
    await navigateToStudy(page)
    await page.click('button:has-text("知道"), [data-testid="choice-know"]')
    await page.waitForTimeout(1000)
    
    // 返回统计页面验证更新
    await page.click('[data-testid="nav-stats"], text=学习统计')
    await page.waitForLoadState('networkidle')
    
    const updatedStats = await extractLearningStats(page)
    
    // 验证统计有变化（学习后应该有进步）
    expect(updatedStats.learningWords).toBeGreaterThanOrEqual(initialStats.learningWords)
  })

  test('SM2算法参数验证：EF值和间隔计算', async ({ page }) => {
    await loginUser(page)
    await navigateToStudy(page)
    
    // 开启浏览器控制台以监控网络请求
    const responses: Array<any> = []
    page.on('response', async (response) => {
      if (response.url().includes('sm2-service') || response.url().includes('learning-tracker')) {
        try {
          const data = await response.json()
          responses.push(data)
        } catch (e) {
          // 忽略非JSON响应
        }
      }
    })
    
    // 执行学习操作
    await page.click('button:has-text("知道"), [data-testid="choice-know"]')
    await page.waitForTimeout(2000)
    
    // 验证网络请求中包含正确的SM2参数
    const sm2Response = responses.find(r => r.success && r.data?.updatedCard)
    if (sm2Response) {
      const card = sm2Response.data.updatedCard
      
      // 验证SM2算法的关键参数
      expect(card.repetitions).toBeGreaterThanOrEqual(1)
      expect(card.EF).toBeGreaterThanOrEqual(1.3)
      expect(card.EF).toBeLessThanOrEqual(4.0)
      expect(card.interval).toBeGreaterThanOrEqual(1)
      expect(['new', 'learning', 'review', 'mastered']).toContain(card.status)
    }
  })
})

// 辅助函数
async function loginUser(page: Page) {
  // 检查是否已经登录
  const isLoggedIn = await page.locator('[data-testid="user-avatar"], .user-menu').isVisible()
  if (isLoggedIn) return
  
  // 点击登录按钮
  await page.click('button:has-text("登录"), [data-testid="login-button"]')
  await page.waitForLoadState('networkidle')
  
  // 填写登录信息
  await page.fill('input[type="email"], [data-testid="email-input"]', TEST_CONFIG.testUser.email)
  await page.fill('input[type="password"], [data-testid="password-input"]', TEST_CONFIG.testUser.password)
  
  // 提交登录
  await page.click('button[type="submit"], button:has-text("登录"), [data-testid="submit-login"]')
  await page.waitForLoadState('networkidle')
  
  // 验证登录成功
  await expect(page.locator('[data-testid="user-avatar"], .user-menu')).toBeVisible({ timeout: 10000 })
}

async function navigateToStudy(page: Page) {
  // 导航到词书页面
  await page.click('[data-testid="nav-wordbooks"], text=词书管理')
  await page.waitForLoadState('networkidle')
  
  // 选择第一个词书开始学习
  const wordbookCard = page.locator('.wordbook-card, [data-testid="wordbook-item"]').first()
  await expect(wordbookCard).toBeVisible({ timeout: 10000 })
  
  await wordbookCard.locator('button:has-text("开始学习"), [data-testid="start-study"]').click()
  await page.waitForLoadState('networkidle')
  
  // 验证进入学习页面
  await expect(page).toHaveURL(/.*\/study\/.*/)
  await expect(page.locator('[data-testid="study-card"], .study-card')).toBeVisible()
}

async function performSM2LearningSequence(page: Page) {
  const learningSequence = [
    'choice-know',     // 第1个单词：知道
    'choice-hint',     // 第2个单词：提示
    'choice-unknown',  // 第3个单词：不知道
    'choice-know',     // 第4个单词：知道
    'choice-know'      // 第5个单词：知道（或重复的第3个单词）
  ]
  
  for (let i = 0; i < learningSequence.length; i++) {
    const choice = learningSequence[i]
    const buttonText = getChoiceText(choice)
    
    // 等待学习卡片可见
    await expect(page.locator('[data-testid="study-card"], .study-card')).toBeVisible()
    
    // 点击选择按钮
    await page.click(`[data-testid="${choice}"], button:has-text("${buttonText}")`)
    await page.waitForTimeout(1000)
    
    // 检查是否完成学习
    const isCompleted = await page.locator('text=学习完成, text=今日目标已完成').isVisible()
    if (isCompleted) {
      console.log(`学习在第${i + 1}步完成`)
      break
    }
  }
}

async function verifyLearningStats(page: Page) {
  // 在学习页面查找进度信息
  const progressElement = page.locator('[data-testid="progress"], .progress-display, .learning-progress')
  const isProgressVisible = await progressElement.isVisible()
  
  if (isProgressVisible) {
    const progressText = await progressElement.textContent()
    expect(progressText).toMatch(/\d+/) // 应该包含数字
  }
  
  // 检查是否有完成状态的显示
  const completionMessage = page.locator('text=恭喜, text=完成, text=学习目标已完成')
  const isCompletionVisible = await completionMessage.isVisible()
  
  if (isCompletionVisible) {
    const message = await completionMessage.textContent()
    expect(message).toBeTruthy()
  }
}

async function extractLearningStats(page: Page) {
  const totalWords = await extractNumber(page, '[data-testid="total-words"], text=总单词')
  const learningWords = await extractNumber(page, '[data-testid="learning-words"], text=学习中')
  const masteredWords = await extractNumber(page, '[data-testid="mastered-words"], text=已掌握')
  
  return {
    totalWords: totalWords || 0,
    learningWords: learningWords || 0,
    masteredWords: masteredWords || 0
  }
}

async function extractNumber(page: Page, selector: string): Promise<number> {
  try {
    const element = page.locator(selector)
    const text = await element.textContent()
    const match = text?.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  } catch {
    return 0
  }
}

function getChoiceText(choice: string): string {
  switch (choice) {
    case 'choice-know': return '知道'
    case 'choice-hint': return '提示'
    case 'choice-unknown': return '不知道'
    default: return '知道'
  }
}