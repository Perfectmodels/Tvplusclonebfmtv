'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';

type Toast = { id: number; type: 'success' | 'error'; message: string };
type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast doit être utilisé dans ToastProvider.');
  return value;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, type, message }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ success: (m) => push('success', m), error: (m) => push('error', m) }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={'toast toast-' + toast.type} key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}>
            {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToasts((l) => l.filter((t) => t.id !== toast.id))} aria-label="Fermer">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
