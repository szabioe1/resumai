'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const numValue = Number(value) || 0
  
  // Create a more sophisticated color gradient based on value
  const getGradientColor = (val: number) => {
    if (val >= 80) {
      return 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)'
    } else if (val >= 60) {
      return 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)'
    } else {
      return 'linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)'
    }
  }
  
  return (
    <div className={cn('relative h-3 w-full overflow-hidden rounded-full bg-slate-700', className)}>
      <div
        className="h-full transition-all duration-700 ease-out shadow-lg"
        style={{ 
          width: `${numValue}%`,
          background: getGradientColor(numValue),
          boxShadow: numValue > 0 ? `0 0 12px ${numValue >= 80 ? 'rgba(16, 185, 129, 0.5)' : numValue >= 60 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(245, 158, 11, 0.5)'}` : 'none'
        }}
      />
    </div>
  )
}

export { Progress }

