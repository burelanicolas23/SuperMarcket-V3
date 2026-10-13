import React from 'react';
import { StockStatus } from '../../models';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface BadgeProps {
  status: StockStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StockBadge: React.FC<BadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs sm:text-sm px-2.5 py-1 font-semibold',
    lg: 'text-sm sm:text-base px-3.5 py-1.5 font-bold',
  };

  switch (status) {
    case 'disponible':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses[size]}`}
        >
          {showIcon && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          Disponible
        </span>
      );
    case 'bajo_stock':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses[size]}`}
        >
          {showIcon && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
          Stock Bajo
        </span>
      );
    case 'agotado':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-bold ${sizeClasses[size]}`}
        >
          {showIcon && <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          Agotado
        </span>
      );
    default:
      return null;
  }
};
