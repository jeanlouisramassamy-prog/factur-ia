import { create } from 'zustand'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastStore {
  toasts: Toast[]
  add: (message: string, type?: Toast['type']) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string, type?: Toast['type']) {
  useToastStore.getState().add(message, type)
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'bg-success-50 border-success-500 text-success-700',
  error: 'bg-error-50 border-error-500 text-error-700',
  warning: 'bg-warning-50 border-warning-500 text-warning-600',
  info: 'bg-info-50 border-info-500 text-primary-700',
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg animate-slideDown',
              colors[t.type]
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="shrink-0 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
