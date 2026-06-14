import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Fermeture au clavier (Échap) tant que le dialogue est ouvert.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => !loading && onCancel()}
      />
      <div className="card-axa relative w-full max-w-md p-6">
        <button
          type="button"
          onClick={() => !loading && onCancel()}
          aria-label="Fermer"
          className="absolute right-4 top-4 cursor-pointer rounded-md p-1 text-muted hover:bg-background hover:text-foreground disabled:opacity-50"
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === 'danger' ? 'bg-axa-red/10 text-axa-red' : 'bg-axa-blue/10 text-axa-blue'
            }`}
          >
            <AlertTriangle size={20} />
          </span>
          <div className="flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-foreground">
              {title}
            </h2>
            <div className="mt-1 text-sm text-muted">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
