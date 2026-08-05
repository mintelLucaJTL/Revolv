import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastType = "success" | "error" | "warning";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastOptions {
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const toastClasses: Record<ToastType, string> = {
  success:
    "border-green-100 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/60 dark:text-green-300",
  error:
    "border-red-100 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-950/60 dark:text-red-300",
  warning:
    "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/60 dark:text-amber-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(({ type, message }: ToastOptions) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toastClasses[toast.type]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
