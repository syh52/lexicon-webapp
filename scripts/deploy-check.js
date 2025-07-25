#!/usr/bin/env node

/**
 * CloudBase 静态部署检查脚本
 * 根据最佳实践检查项目配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 CloudBase 静态部署配置检查\n');

const checks = [
  {
    name: '检查构建产物目录',
    check: () => fs.existsSync(path.join(projectRoot, 'dist')),
    fix: '运行 npm run build 构建项目'
  },
  {
    name: '检查 Vite 相对路径配置',
    check: () => {
      const viteConfig = fs.readFileSync(path.join(projectRoot, 'vite.config.js'), 'utf-8');
      return viteConfig.includes("base: './'");
    },
    fix: '在 vite.config.js 中设置 base: "./"'
  },
  {
    name: '检查 CloudBase 配置文件',
    check: () => fs.existsSync(path.join(projectRoot, 'cloudbaserc.json')),
    fix: '创建 cloudbaserc.json 配置文件'
  },
  {
    name: '检查环境变量配置',
    check: () => fs.existsSync(path.join(projectRoot, '.env.example')),
    fix: '创建 .env.example 环境变量示例文件'
  },
  {
    name: '检查部署脚本',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
      return pkg.scripts && pkg.scripts.deploy;
    },
    fix: '在 package.json 中添加 deploy 脚本'
  },
  {
    name: '检查云函数目录',
    check: () => fs.existsSync(path.join(projectRoot, 'cloudfunctions')),
    fix: '创建 cloudfunctions 目录放置云函数'
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   💡 解决方案: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 所有检查通过！项目已准备好部署到 CloudBase 静态托管');
  console.log('\n📋 部署命令:');
  console.log('   npm run deploy');
  console.log('   或者: cloudbase hosting deploy dist');
} else {
  console.log('⚠️  发现问题，请根据上述建议修复后重新检查');
}

console.log('\n📚 相关文档:');
console.log('   CloudBase 静态托管: https://docs.cloudbase.net/hosting/');
console.log('   最佳实践指南: ./部署最佳实践指南.md');