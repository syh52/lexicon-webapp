import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要清理的文件夹
const foldersToClean = [
  'src/components',
  'src/pages',
  'src/services',
  'src/contexts'
];

// 不清理的文件（保留调试信息）
const excludeFiles = [
  'debug.js',
  'cloudbase-test.js'
];

// 清理函数
function cleanConsoleFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 移除常见的console语句（保留console.error）
    content = content.replace(/console\.log\([^)]*\);?\s*\n?/g, '');
    content = content.replace(/console\.info\([^)]*\);?\s*\n?/g, '');
    content = content.replace(/console\.warn\([^)]*\);?\s*\n?/g, '');
    content = content.replace(/console\.debug\([^)]*\);?\s*\n?/g, '');
    
    // 移除空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`清理了文件: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`清理文件 ${filePath} 时出错:`, error);
    return false;
  }
}

// 递归扫描文件夹
function scanFolder(folderPath) {
  try {
    const items = fs.readdirSync(folderPath);
    let cleanedCount = 0;
    
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        cleanedCount += scanFolder(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
        // 检查是否在排除列表中
        if (!excludeFiles.includes(item)) {
          if (cleanConsoleFromFile(fullPath)) {
            cleanedCount++;
          }
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error(`扫描文件夹 ${folderPath} 时出错:`, error);
    return 0;
  }
}

// 主函数
function main() {
  console.log('🧹 开始清理生产代码中的console语句...');
  
  let totalCleaned = 0;
  
  for (const folder of foldersToClean) {
    const folderPath = path.join(path.dirname(__dirname), folder);
    if (fs.existsSync(folderPath)) {
      console.log(`\n📁 扫描文件夹: ${folder}`);
      totalCleaned += scanFolder(folderPath);
    }
  }
  
  console.log(`\n✅ 清理完成！共清理了 ${totalCleaned} 个文件`);
  
  // 特殊处理App.tsx中的process.env判断
  const appPath = path.join(path.dirname(__dirname), 'src/App.tsx');
  if (fs.existsSync(appPath)) {
    console.log('\n🔧 处理App.tsx中的环境变量判断...');
    let content = fs.readFileSync(appPath, 'utf8');
    
    // 保留开发环境的console，但优化生产环境
    content = content.replace(
      /if \(process\.env\.NODE_ENV === 'development'\) \{[\s\S]*?\}/g,
      ''
    );
    
    fs.writeFileSync(appPath, content);
    console.log('✅ App.tsx环境变量判断已优化');
  }
}

main();