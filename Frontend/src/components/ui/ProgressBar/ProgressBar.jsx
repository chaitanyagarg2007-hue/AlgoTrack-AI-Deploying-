import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import './ProgressBar.css';

export const ProgressBar = ({ 
  value, 
  max = 100, 
  label,
  colorClass = 'progress-primary'
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="progress-container">
      {label && (
        <div className="progress-header">
          <span className="progress-label">{label}</span>
          <span className="progress-value">{Math.round(percentage)}%</span>
        </div>
      )}
      <ProgressPrimitive.Root className="progress-root" value={percentage}>
        <ProgressPrimitive.Indicator
          className={`progress-indicator ${colorClass}`}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
};
