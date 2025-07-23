/**
 * 音频可视化组件
 * 显示音量级别和录音状态
 */

import React, { useRef, useEffect, useState } from 'react';
import './AudioVisualizer.css';

const AudioVisualizer = ({ 
  volumeLevel = 0, 
  isRecording = false, 
  isSilent = true,
  className = '' 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [visualData, setVisualData] = useState([]);
  
  // 可视化配置
  const config = {
    barCount: 32,
    barWidth: 4,
    barSpacing: 2,
    maxHeight: 80,
    smoothing: 0.8,
    colors: {
      recording: '#10B981', // 绿色 - 录音中
      silent: '#6B7280',    // 灰色 - 静音
      active: '#3B82F6'     // 蓝色 - 活跃
    }
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 初始化可视化数据
    if (visualData.length === 0) {
      setVisualData(new Array(config.barCount).fill(0));
    }
    
    const animate = () => {
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      // 模拟频谱数据
      const newData = [...visualData];
      
      if (isRecording && !isSilent) {
        // 活跃状态：根据音量生成随机频谱
        for (let i = 0; i < config.barCount; i++) {
          const target = Math.random() * volumeLevel * config.maxHeight * (1 + Math.sin(Date.now() * 0.01 + i) * 0.3);
          newData[i] = newData[i] * config.smoothing + target * (1 - config.smoothing);
        }
      } else if (isRecording) {
        // 录音但静音：缓慢衰减
        for (let i = 0; i < config.barCount; i++) {
          newData[i] *= 0.95;
        }
      } else {
        // 停止录音：快速衰减到0
        for (let i = 0; i < config.barCount; i++) {
          newData[i] *= 0.85;
        }
      }
      
      setVisualData(newData);
      
      // 绘制频谱条
      for (let i = 0; i < config.barCount; i++) {
        const barHeight = Math.max(2, newData[i]);
        const x = i * (config.barWidth + config.barSpacing);
        const y = height - barHeight;
        
        // 选择颜色
        let color = config.colors.silent;
        if (isRecording) {
          if (!isSilent) {
            color = config.colors.recording;
          } else {
            color = config.colors.active;
          }
        }
        
        // 绘制渐变条
        if (height > 0 && isFinite(height) && isFinite(y)) {
          const gradient = ctx.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(0, color + '80'); // 半透明
          gradient.addColorStop(1, color);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = color;
        }
        
        ctx.fillRect(x, y, config.barWidth, barHeight);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volumeLevel, isRecording, isSilent, visualData]);
  
  return (
    <div className={`audio-visualizer ${className}`}>
      <canvas
        ref={canvasRef}
        width={280}
        height={100}
        className="visualizer-canvas"
      />
      
      <div className="visualizer-info">
        <div className={`status-indicator ${isRecording ? 'recording' : 'idle'}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {isRecording ? (isSilent ? 'Listening...' : 'Recording...') : 'Ready'}
          </span>
        </div>
        
        <div className="volume-meter">
          <div className="volume-bar">
            <div 
              className="volume-fill"
              style={{
                width: `${Math.min(100, volumeLevel * 1000)}%`,
                backgroundColor: isSilent ? '#6B7280' : '#10B981'
              }}
            ></div>
          </div>
          <span className="volume-text">
            {(volumeLevel * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;