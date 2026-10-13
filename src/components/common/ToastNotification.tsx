import React from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { notification, clearNotification } = useSupermarket();

  if (!notification) return null;

  const config = {
    success: {
      bg: 'bg-emerald-600',
      border: 'border-emerald-700',
      icon: CheckCircle2,
      defaultTitle: 'Operación realizada',
    },
    error: {
      bg: 'bg-rose-600',
      border: 'border-rose-700',
      icon: AlertCircle,
      defaultTitle: 'Ocurrió un error',
    },
    warning: {
      bg: 'bg-amber-600',
      border: 'border-amber-700',
      icon: AlertTriangle,
      defaultTitle: 'Atención',
    },
    info: {
      bg: 'bg-blue-600',
      border: 'border-blue-700',
      icon: Info,
      defaultTitle: 'Información',
    },
  }[notification.type];

  const Icon = config.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`${config.bg} text-white rounded-2xl shadow-2xl p-4 sm:p-5 flex items-start gap-3.5 border ${config.border}`}
        role="alert"
      >
        <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-base sm:text-lg leading-tight">
            {notification.title || config.defaultTitle}
          </p>
          <p className="text-sm sm:text-base text-white/95 mt-1 font-medium leading-snug">
            {notification.message}
          </p>
        </div>
        <button
          onClick={clearNotification}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
          title="Cerrar notificación"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
