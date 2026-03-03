import React from 'react';
import { motion } from 'motion/react';

interface WaterProgressProps {
  progress: number; // 0 to 100
  size?: number;
  color?: string;
}

export function WaterProgress({ progress, size = 100, color = '#E1FF01' }: WaterProgressProps) {
  // Normalize progress to ensure it's between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background Circle */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/5"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>

      {/* Percentage Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-medium font-mono text-zinc-100">
          {normalizedProgress.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
