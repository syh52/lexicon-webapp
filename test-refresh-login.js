// 测试登录后刷新页面是否保持登录状态
const testRefreshLogin = async () => {
  // 打开浏览器控制台并访问应用
  console.log('请在浏览器中执行以下步骤：');
  console.log('1. 打开 http://localhost:5173');
  console.log('2. 登录账号');
  console.log('3. 打开开发者工具控制台（F12）');
  console.log('4. 执行以下命令查看CloudBase存储状态：');
  console.log('');
  console.log('// 查看所有localStorage键');
  console.log('Object.keys(localStorage).filter(k => k.includes("tcb") || k.includes("cloudbase") || k.includes("auth"))');
  console.log('');
  console.log('// 查看具体的认证信息');
  console.log('localStorage.getItem("cloudbase_access_token_cloud1-7g7oatv381500c81")');
  console.log('localStorage.getItem("cloudbase_refresh_token_cloud1-7g7oatv381500c81")');
  console.log('');
  console.log('5. 刷新页面（F5）');
  console.log('6. 观察控制台日志，查看是否成功恢复登录状态');
  console.log('');
  console.log('预期结果：');
  console.log('- 刷新后仍然保持登录状态');
  console.log('- 控制台显示"检测到有效的登录状态"');
  console.log('- 不会跳转到登录页面');
};

testRefreshLogin();