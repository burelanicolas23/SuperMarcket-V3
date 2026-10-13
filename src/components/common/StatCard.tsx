import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant: 'green' | 'blue' | 'amber' | 'rose' | 'emerald';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  onClick,
}) => {
  const styles = {
    green: {
      bg: 'bg-emerald-500',
      lightBg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    emerald: {
      bg: 'bg-emerald-600',
      lightBg: 'bg-emerald-50/70',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      iconBg: 'bg-emerald-100 text-emerald-800',
    },
    blue: {
      bg: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      iconBg: 'bg-blue-100 text-blue-700',
    },
    amber: {
      bg: 'bg-amber-500',
      lightBg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      hoverBorder: 'hover:border-amber-400',
      iconBg: 'bg-amber-100 text-amber-700',
    },
    rose: {
      bg: 'bg-rose-500',
      lightBg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-300',
      hoverBorder: 'hover:border-rose-400',
      iconBg: 'bg-rose-100 text-rose-700',
    },
  };

  const style = styles[variant];

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl p-5 sm:p-6 shadow-sm border ${style.border} ${
        onClick ? `${style.hoverBorder} cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5` : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3.5 sm:p-4 rounded-xl flex-shrink-0 ${style.iconBg}`}>
          <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
      </div>
    </div>
  );
};
