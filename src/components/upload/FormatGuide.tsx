import React, { useState } from 'react';
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { generateSampleCSV, generateSampleJSON } from '../../utils/fileUtils';

export default function FormatGuide() {
  const [expandedFormat, setExpandedFormat] = useState<'csv' | 'json' | null>(null);

  const downloadSample = (format: 'csv' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      content = generateSampleCSV();
      filename = 'sample-wordbook.csv';
      mimeType = 'text/csv';
    } else {
      content = generateSampleJSON();
      filename = 'sample-wordbook.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFormat = (format: 'csv' | 'json') => {
    setExpandedFormat(expandedFormat === format ? null : format);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
          <FileText className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">文件格式说明</h3>
          <p className="text-gray-400 text-sm">支持CSV和JSON两种格式</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* CSV格式 */}
        <div className="border border-gray-600/20 rounded-xl overflow-hidden">
          <div 
            className="p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => toggleFormat('csv')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-white font-medium">CSV 格式</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  推荐
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSample('csv');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="下载示例"
                >
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
                {expandedFormat === 'csv' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          {expandedFormat === 'csv' && (
            <div className="p-4 bg-gray-900/50 border-t border-gray-600/20">
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-medium mb-2">格式要求：</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• 第一行为标题行（必需）</li>
                    <li>• 必需列：<code className="bg-gray-800 px-1 rounded">word</code>、<code className="bg-gray-800 px-1 rounded">meaning</code></li>
                    <li>• 可选列：<code className="bg-gray-800 px-1 rounded">phonetic</code>、<code className="bg-gray-800 px-1 rounded">example</code>、<code className="bg-gray-800 px-1 rounded">pos</code></li>
                    <li>• 使用逗号分隔，支持UTF-8编码</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">示例内容：</h4>
                  <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-x-auto">
{`word,phonetic,meaning,example,pos
apple,/ˈæpəl/,苹果,I like to eat apples.,n.
book,/bʊk/,书,She is reading a book.,n.
run,/rʌn/,跑步,I run every morning.,v.`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* JSON格式 */}
        <div className="border border-gray-600/20 rounded-xl overflow-hidden">
          <div 
            className="p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => toggleFormat('json')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-white font-medium">JSON 格式</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  高级
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSample('json');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="下载示例"
                >
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
                {expandedFormat === 'json' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          {expandedFormat === 'json' && (
            <div className="p-4 bg-gray-900/50 border-t border-gray-600/20">
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-medium mb-2">格式要求：</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• 必需字段：<code className="bg-gray-800 px-1 rounded">name</code>、<code className="bg-gray-800 px-1 rounded">words</code></li>
                    <li>• 可选字段：<code className="bg-gray-800 px-1 rounded">description</code></li>
                    <li>• 单词必需字段：<code className="bg-gray-800 px-1 rounded">word</code>、<code className="bg-gray-800 px-1 rounded">meaning</code></li>
                    <li>• 单词可选字段：<code className="bg-gray-800 px-1 rounded">phonetic</code>、<code className="bg-gray-800 px-1 rounded">example</code>、<code className="bg-gray-800 px-1 rounded">pos</code></li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">示例内容：</h4>
                  <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "name": "示例词书",
  "description": "这是一个示例词书",
  "words": [
    {
      "word": "apple",
      "phonetic": "/ˈæpəl/",
      "meaning": "苹果",
      "example": "I like to eat apples.",
      "pos": "n."
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">提示</span>
        </div>
        <p className="text-blue-300 text-sm mt-1">
          上传前请确保数据格式正确，系统会自动验证必需字段。如有疑问，请下载示例文件作为参考。
        </p>
      </div>
    </div>
  );
}