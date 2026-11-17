import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-400 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
  info: <Info className="h-5 w-5 text-cyan-400 shrink-0" />,
};

const borderColors: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-cyan-500',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((opts: Omit<ToastData, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { ...opts, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map(t => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => { if (!open) removeToast(t.id); }}
            className={cn(
              'glass-elevated rounded-lg border-l-4 p-4',
              'flex items-start gap-3',
              'data-[state=open]:animate-slide-in-right',
              'data-[state=closed]:animate-fade-out',
              'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
              'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
              'data-[swipe=end]:animate-fade-out',
              borderColors[t.variant]
            )}
          >
            {icons[t.variant]}
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="rounded-lg p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 transition-colors">
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};
