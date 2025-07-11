import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析CSV文件
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return lines.slice(1).map((line, index) => {
    const values = line.split(',');
    const word = {};
    
    headers.forEach((header, i) => {
      word[header.trim()] = values[i] ? values[i].trim() : '';
    });
    
    return {
      _id: `word_${index + 1}`,
      wordbookId: 'basic_english',
      word: word.word,
      phonetic: word.phonetic,
      meaning: word.meaning,
      example: word.example,
      pos: word.pos,
      audioUrl: `https://dict.youdao.com/dictvoice?audio=${word.word}&type=1`
    };
  });
}

// 读取CSV文件
const csvPath = path.join(__dirname, '../data/sample_wordlist.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const words = parseCSV(csvContent);

// 创建词书记录
const wordbook = {
  _id: 'basic_english',
  name: '基础英语词汇',
  cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
  totalCount: words.length,
  description: '适合初学者的基础英语词汇集合',
  createdAt: new Date(),
  updatedAt: new Date()
};

// 导出数据
export { wordbook, words };

console.log(`准备导入词书: ${wordbook.name}`);
console.log(`词汇数量: ${words.length}`);
console.log('示例词汇:');
words.slice(0, 3).forEach(word => {
  console.log(`- ${word.word} ${word.phonetic} ${word.meaning}`);
});