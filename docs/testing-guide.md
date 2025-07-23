# 语音AI助手测试指南

## 🎉 部署状态：已完成
✅ **云函数部署完成！**所有4个核心云函数已成功部署到您的云开发环境：
- `voice-assistant` (WebSocket核心函数)
- `text-to-speech` (语音合成)  
- `speech-recognition` (语音识别)
- `ai-chat` (AI对话)

**环境信息:**
- 环境ID: `cloud1-7g7oatv381500c81`
- 地域: `ap-shanghai` (上海)
- 状态: `NORMAL` (正常运行)

## 🚀 快速测试步骤

### 第一阶段：基础功能测试 (无需API密钥)

#### 1. 安装依赖并启动开发服务器

```bash
# 进入项目目录
cd /home/dministrator/Projects/lexicon-webapp

# 安装前端依赖
npm install

# 如果需要安装CloudBase SDK
npm install @cloudbase/js-sdk

# 启动开发服务器
npm start
```

#### 2. 浏览器测试基本功能

打开浏览器访问 `http://localhost:3000`，测试以下功能：

**✅ 界面加载测试:**
- [ ] 页面正常加载，显示"AI英语口语助手"标题
- [ ] 连接状态显示为"已连接"或"未连接"
- [ ] 音频可视化组件正常显示
- [ ] 设置按钮可以打开设置面板

**✅ 音频权限测试:**
- [ ] 点击"开始对话"按钮
- [ ] 浏览器弹出麦克风权限请求
- [ ] 允许麦克风权限后，状态变为"Listening..."
- [ ] 说话时音量条有反应，频谱有波动

**✅ CloudBase连接测试:**
- [ ] 打开浏览器控制台 (F12)
- [ ] 查看是否有CloudBase初始化成功的日志
- [ ] 查看WebSocket连接状态

### 第二阶段：云函数单独测试

#### 测试AI对话函数

```bash
# 在浏览器控制台执行以下代码测试AI函数
const testAI = async () => {
  const cloudbase = window.cloudbase || require('@cloudbase/js-sdk');
  const app = cloudbase.init({
    env: 'cloud1-7g7oatv381500c81'
  });
  
  try {
    // 匿名登录
    await app.auth().signInAnonymously();
    
    // 调用AI对话函数
    const result = await app.functions().callFunction({
      name: 'ai-chat',
      data: {
        messages: [
          { role: 'user', content: 'Hello, how are you today?' }
        ],
        userLevel: 'intermediate',
        scenario: 'general'
      }
    });
    
    console.log('AI函数测试结果:', result);
  } catch (error) {
    console.error('AI函数测试失败:', error);
  }
};

// 执行测试
testAI();
```

#### 测试语音识别函数

```bash
# 测试语音识别函数（使用模拟音频数据）
const testASR = async () => {
  const app = cloudbase.init({
    env: 'cloud1-7g7oatv381500c81'
  });
  
  // 匿名登录
  await app.auth().signInAnonymously();
  
  // 使用空的base64数据测试函数调用
  const result = await app.functions().callFunction({
    name: 'speech-recognition',
    data: {
      audio: 'dGVzdA==', // base64编码的"test"
      language: 'en-US',
      format: 'pcm',
      sampleRate: 24000
    }
  });
  
  console.log('语音识别测试结果:', result);
};

testASR();
```

#### 测试语音合成函数

```bash
# 测试语音合成函数
const testTTS = async () => {
  const app = cloudbase.init({
    env: 'cloud1-7g7oatv381500c81'
  });
  
  await app.auth().signInAnonymously();
  
  const result = await app.functions().callFunction({
    name: 'text-to-speech',
    data: {
      text: 'Hello, this is a test message.',
      voiceType: 1001, // 英语女声
      primaryLanguage: 2 // 英语
    }
  });
  
  console.log('语音合成测试结果:', result);
};

testTTS();
```

### 第三阶段：API密钥配置 (可选)

如果您想要完整体验，可以配置以下API密钥：

#### 1. OpenAI/GPTs.vin API (用于AI对话)

```bash
# 在 .env.local 中配置
REACT_APP_GPTS_VIN_API_KEY=your-api-key-here
REACT_APP_OPENAI_BASE_URL=https://api.gpts.vin
```

#### 2. 腾讯云API (用于语音识别和合成)

```bash
# 在 .env.local 中配置
REACT_APP_TENCENT_SECRET_ID=your-secret-id
REACT_APP_TENCENT_SECRET_KEY=your-secret-key
```

#### 3. 更新云函数环境变量

配置好API密钥后，需要更新云函数的环境变量。您可以：

1. **通过腾讯云控制台:**
   - 访问 [云开发控制台](https://console.cloud.tencent.com/tcb)
   - 进入您的环境 `cloud1-7g7oatv381500c81`
   - 在"云函数"页面编辑各个函数的环境变量

2. **或使用命令行工具 (推荐):**

```bash
# 更新AI对话函数环境变量的示例命令
# (实际API密钥请替换为真实值)
```

### 第四阶段：端到端测试

配置完API密钥后进行完整测试：

#### 🎤 完整语音对话流程测试

1. **启动对话:**
   - 点击"开始对话"按钮
   - 确认麦克风权限已允许
   - 状态显示"Listening..."

2. **语音输入测试:**
   ```
   说话内容建议：
   - "Hello, how are you today?"
   - "I want to practice English conversation"  
   - "Can you help me improve my pronunciation?"
   ```

3. **检查响应流程:**
   - [ ] 语音被识别为文字显示在界面上
   - [ ] AI生成回复文本
   - [ ] AI回复被合成为语音播放
   - [ ] 对话记录保存在界面中
   - [ ] 显示语言质量分析结果

4. **学习功能测试:**
   - [ ] 查看语法错误纠正
   - [ ] 检查发音改进建议  
   - [ ] 观察词汇使用评估
   - [ ] 测试不同对话场景切换

## 🔍 问题排查

### 常见问题和解决方案

#### 1. 麦克风权限问题
**现象:** 点击录音按钮无反应，或提示权限被拒绝
**解决:**
- 检查浏览器地址栏左侧是否显示麦克风被阻止
- 点击地址栏左侧图标，选择"允许"麦克风访问
- 刷新页面重试

#### 2. WebSocket连接失败
**现象:** 连接状态显示"未连接"，控制台有WebSocket错误
**解决:**
- 检查网络连接
- 确认云函数部署成功
- 查看云函数日志是否有错误

#### 3. 云函数调用失败
**现象:** 控制台显示函数调用错误
**解决:**
- 确认已成功匿名登录CloudBase
- 检查函数名称是否正确
- 查看云函数运行日志

#### 4. 音频播放无声音
**现象:** AI有回复但无语音播放
**解决:**
- 检查浏览器音量设置
- 确认音响/耳机连接正常
- 查看语音合成函数是否正常工作

### 📊 调试工具

#### 1. 浏览器开发者工具
```javascript
// 在控制台查看详细日志
localStorage.setItem('debug', 'true');
// 重新加载页面查看调试信息
```

#### 2. 查看云函数日志
使用MCP工具查看函数运行日志：
```bash
# 查看指定函数的日志
```

#### 3. 网络请求监控
- 在浏览器Network标签页查看API调用
- 检查WebSocket连接状态
- 监控音频数据传输

## 📈 性能测试

### 音频延迟测试
- 记录从说话到听到AI回复的总时长
- 理想延迟: < 3秒
- 可接受延迟: < 5秒

### 识别准确率测试
- 测试不同口音和语速的识别效果
- 在不同噪音环境下测试
- 记录识别错误率

### 并发测试  
- 多个浏览器窗口同时使用
- 测试系统稳定性

## 🎯 测试检查清单

### 基础功能 ✅
- [ ] 页面正常加载
- [ ] CloudBase连接成功
- [ ] 麦克风权限正常
- [ ] 音频可视化工作
- [ ] WebSocket连接建立

### 语音功能 ✅  
- [ ] 语音录制正常
- [ ] 语音识别准确
- [ ] AI对话生成
- [ ] 语音合成播放
- [ ] 对话记录保存

### 学习功能 ✅
- [ ] 语言质量分析
- [ ] 学习建议生成
- [ ] 进度统计显示
- [ ] 设置面板工作

### 用户体验 ✅
- [ ] 界面响应流畅
- [ ] 错误提示清晰
- [ ] 帮助文档完整
- [ ] 移动端适配良好

---

## 🚀 开始测试

现在您可以按照上述步骤开始测试了！从第一阶段的基础功能测试开始，逐步验证各个功能模块。

如果在测试过程中遇到问题，请参考"问题排查"部分，或查看浏览器控制台的详细错误信息。

**建议的测试顺序:**
1. ✅ 基础界面和CloudBase连接
2. ✅ 音频权限和录制功能  
3. ✅ 云函数单独调用测试
4. ⭐ 配置API密钥 (可选)
5. 🎯 端到端完整对话测试

祝您测试顺利！🎉