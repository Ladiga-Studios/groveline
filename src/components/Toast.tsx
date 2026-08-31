"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "success" | "error" | "info";
type ToastState = { message: string; kind: Kind } | null;
const ToastContext = createContext<(message: string, kind?: Kind) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: Kind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className="toast"
          data-kind={toast.kind}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
