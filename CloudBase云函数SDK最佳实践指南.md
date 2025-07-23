# 🔧 CloudBase 云函数 SDK 最佳实践指南

## 📋 **项目云函数SDK统一规范**

基于腾讯CloudBase官方文档，本项目已统一所有云函数的SDK使用规范。

### ✅ **标准初始化模式**

```javascript
const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase - 使用环境变量自动获取当前环境
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

// 获取数据库实例
const db = app.database();

exports.main = async (event, context) => {
  // 云函数逻辑
};
```

### 🚫 **避免的错误做法**

❌ **错误1: 硬编码环境ID**
```javascript
// 不要这样做
const app = tcb.init({
  env: 'cloud1-7g7oatv381500c81' // 硬编码环境ID
});
```

✅ **正确做法**
```javascript
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV // 使用环境变量
});
```

❌ **错误2: 混合使用SDK**
```javascript
// 不要这样做
const tcb = require('@cloudbase/node-sdk');
const cloud = require('wx-server-sdk');

const app = tcb.init(/*...*/);
await cloud.callFunction(/*...*/); // 混合调用
```

✅ **正确做法**
```javascript
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init(/*...*/);
await app.callFunction(/*...*/); // 统一使用同一SDK
```

## 📦 **统一的 package.json 配置**

所有云函数统一使用以下package.json模板：

```json
{
  "name": "function-name",
  "version": "1.0.0",
  "description": "函数描述",
  "main": "index.js",
  "dependencies": {
    "@cloudbase/node-sdk": "^2.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "author": "Lexicon WebApp",
  "license": "MIT"
}
```

### 📋 **依赖版本说明**
- `@cloudbase/node-sdk`: 统一使用 `^2.0.0`
- 避免使用 `latest` 或过高的版本号
- 确保Node.js版本兼容性 `>=18.0.0`

## 🛠 **常用功能实现**

### 1️⃣ **数据库操作**

```javascript
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});
const db = app.database();

exports.main = async (event, context) => {
  // 查询数据
  const { data } = await db.collection('users').get();
  
  // 添加数据
  await db.collection('users').add({
    name: 'test',
    createTime: new Date()
  });
  
  // 更新数据
  await db.collection('users')
    .doc('doc-id')
    .update({
      name: 'updated'
    });
  
  // 删除数据
  await db.collection('users').doc('doc-id').remove();
};
```

### 2️⃣ **调用其他云函数**

```javascript
exports.main = async (event, context) => {
  // 调用其他云函数
  const result = await app.callFunction({
    name: 'user-settings',
    data: { 
      action: 'get', 
      userId: 'user123' 
    }
  });
  
  if (result.result.success) {
    return result.result.data;
  }
};
```

### 3️⃣ **获取用户信息**

```javascript
exports.main = async (event, context) => {
  // 获取用户身份信息
  const userInfo = await app.auth().getUserInfo();
  
  const {
    openId,      // 微信openId，非微信授权登录则空
    appId,       // 微信appId，非微信授权登录则空  
    uid,         // 用户唯一ID
    customUserId // 开发者自定义的用户唯一id
  } = userInfo;
  
  return { userInfo };
};
```

### 4️⃣ **云存储操作**

```javascript
const fs = require('fs');
const path = require('path');

exports.main = async (event, context) => {
  // 上传文件
  const fileStream = fs.createReadStream(path.join(__dirname, "demo.jpg"));
  const uploadResult = await app.uploadFile({
    cloudPath: "demo.jpg",
    fileContent: fileStream
  });
  
  // 删除文件
  await app.deleteFile({
    fileList: ["demo.jpg"]
  });
  
  return { uploadResult };
};
```

## 🎯 **项目中的实际应用**

### **参考标准实现**

以下云函数已按照最佳实践进行配置，可作为参考模板：

1. **`fsrs-service`** - 完美的数据库操作示例
2. **`userInfo`** - 用户认证和信息管理示例  
3. **`daily-plan`** - 复杂业务逻辑和函数间调用示例
4. **`user-settings`** - 数据验证和设置管理示例

### **已修复的问题**

✅ **高优先级修复**
- `daily-plan`: 统一SDK使用，移除wx-server-sdk混用
- `user-settings`: 更换为CloudBase SDK，移除wx-server-sdk

✅ **中优先级修复**
- `getWordbooks`: 使用环境变量替代硬编码环境ID
- `getWordsByWordbook`: 统一SDK初始化方式

✅ **依赖统一**
- 所有云函数package.json已统一版本号和配置格式
- 统一使用 `@cloudbase/node-sdk: ^2.0.0`

## 🚀 **部署和维护**

### **部署命令**
```bash
# 部署单个云函数
cloudbase functions:deploy function-name

# 或使用MCP工具批量部署
# 会自动读取cloudfunctions目录并部署所有函数
```

### **环境配置**
```bash
# 在CloudBase控制台设置环境变量
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://www.chataiapi.com/v1
```

### **开发建议**
1. 始终使用 `cloudbase.SYMBOL_CURRENT_ENV` 而不是硬编码环境ID
2. 统一使用 `@cloudbase/node-sdk` SDK，避免混用其他SDK  
3. 保持package.json配置的一致性
4. 遵循统一的错误处理和返回格式规范
5. 添加适当的日志记录用于调试

## 📚 **参考文档**

- [CloudBase 服务端 SDK 文档](https://cloud.tencent.com/document/product/876/41772)
- [CloudBase Node.js SDK API](https://docs.cloudbase.net/api-reference/server/node-sdk/introduction.html)
- [腾讯云开发最佳实践](https://cloud.tencent.com/document/product/876/34660)

---

**本文档最后更新**: 2025-01-22  
**项目**: Lexicon 英语学习平台  
**维护者**: Lexicon WebApp Team