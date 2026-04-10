import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-scaleIn">
        <div className="flex items-start gap-3">
          {danger && (
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-6 w-6 text-error-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
            <p className="mt-2 text-sm text-surface-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-error-600 hover:bg-error-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
