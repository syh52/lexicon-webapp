# CloudBase 配置指南

## 已完成的配置优化

### 1. ClientId 配置 ✅

根据 CloudBase v2 SDK 官方文档，`clientId` 参数是可选的，默认使用环境 ID。为了简化配置和避免权限问题，项目采用默认配置：

```javascript
// src/utils/cloudbase.js
const app = cloudbase.init({
  env: 'cloud1-7g7oatv381500c81',
  // clientId 省略，系统将自动使用环境 ID
  region: 'ap-shanghai',
  timeout: 15000
});
```

**官方文档说明**：
- `client_id` 可从云开发平台 --> 身份验证 --> 开发设置 中获取
- **默认使用环境 ID，可以省略此参数**
- 如需自定义 ClientId，可在控制台创建应用身份

### 2. 安全域名配置 ✅

已添加以下开发域名到安全域名列表：
- `localhost`
- `127.0.0.1`
- `localhost:5173` (Vite 默认端口)
- `localhost:3000` (生产预览端口)

### 3. 认证系统优化 ✅

#### 3.1 CloudBase 原生认证方法
已实现 CloudBase 官方推荐的认证方式：

```javascript
// 邮箱验证码登录/注册
const signInWithEmail = async (email, password) => {
  const auth = app.auth();
  const loginState = await auth.signIn({
    username: email,
    password: password
  });
}

// 发送验证码
const sendVerificationCode = async (email) => {
  const auth = app.auth();
  const verification = await auth.getVerification({
    email: email,
  });
}
```

#### 3.2 认证状态管理
优化认证状态检查，确保 CloudBase 连接：

```javascript
const checkLoginStatus = async () => {
  // 首先确保CloudBase连接（匿名登录）
  await ensureLogin();
  
  // 验证CloudBase登录状态
  const loginState = await getLoginState();
  if (loginState && loginState.isLoggedIn) {
    // 恢复用户状态
  }
}
```

### 4. 最佳实践实施 ✅

#### 4.1 初始化优化
- 添加必需的 `clientId` 参数
- 优化超时配置
- 添加详细的初始化日志

#### 4.2 登录状态管理
- 实现自动匿名登录确保连接
- 添加登录状态验证
- 优化错误处理

#### 4.3 降级策略
- CloudBase 原生认证失败时自动降级到自定义认证
- 保持向后兼容性

## 配置验证

项目包含自动配置验证工具：

```bash
# 开发环境自动运行验证
npm run dev
```

验证工具会检查：
1. CloudBase 基础连接
2. ClientId 配置
3. 匿名登录功能
4. 云函数调用
5. 数据库连接
6. 认证系统

## 推荐的后续优化

### 1. 生产环境配置

在生产环境中，建议：

1. **安全域名配置**：
   ```
   https://your-domain.com
   https://your-app.tcloudbaseapp.com
   ```

2. **应用身份配置**（可选）：
   - 登录 [腾讯云控制台](https://console.cloud.tencent.com/tcb)
   - 进入云开发环境 --> 身份验证 --> 开发设置
   - 创建新的应用身份，获取专用 `clientId`
   - 在代码中配置自定义 `clientId`：
   ```javascript
   const app = cloudbase.init({
     env: 'your-env-id',
     clientId: 'your-custom-client-id', // 来自控制台的专用 ClientId
     region: 'ap-shanghai'
   });
   ```

**注意**：对于大多数应用，使用默认的环境 ID 作为 ClientId 已经足够。

### 2. 邮箱验证码完整流程

```javascript
// 完整的邮箱验证码注册流程
const completeEmailSignUp = async (email, password, verificationCode) => {
  const auth = app.auth();
  
  // 1. 验证验证码
  const verifyResult = await auth.verify({
    verification_code: verificationCode,
    verification_id: verificationId,
  });
  
  // 2. 注册用户
  const signUpResult = await auth.signUp({
    email: email,
    password: password,
    verification_token: verifyResult.verification_token,
    name: email.split('@')[0]
  });
}
```

### 3. 第三方登录

可以扩展支持微信、QQ 等第三方登录：

```javascript
// 微信登录示例
const signInWithWeChat = async () => {
  const auth = app.auth();
  
  // 1. 生成微信授权 URL
  const { uri } = await auth.genProviderRedirectUri({
    provider_id: 'wx_open',
    provider_redirect_uri: window.location.origin + '/auth/callback',
    state: 'wx_login'
  });
  
  // 2. 跳转到微信授权页面
  window.location.href = uri;
}
```

## 故障排除

### 常见问题

1. **CORS 错误**
   - 检查安全域名配置
   - 确保域名包含端口号

2. **ClientId 错误**
   - 验证 `clientId` 是否正确配置
   - 检查控制台是否有相关错误

3. **认证失败**
   - 检查网络连接
   - 验证环境 ID 是否正确
   - 查看控制台错误日志

### 调试工具

项目包含详细的调试工具：

```javascript
import { validateConfiguration } from './src/utils/cloudbase-test.js';

// 手动运行配置验证
validateConfiguration().then(result => {
  console.log('配置验证结果:', result);
});
```

## 参考文档

- [CloudBase Web SDK v2 官方文档](https://docs.cloudbase.net/api-reference/webv2/initialization)
- [CloudBase 认证文档](https://docs.cloudbase.net/api-reference/webv2/authentication)
- [安全域名配置](https://docs.cloudbase.net/guide/domain)

---

*本指南确保项目完全符合 CloudBase v2 SDK 的官方最佳实践要求。*