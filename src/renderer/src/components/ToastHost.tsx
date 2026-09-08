import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { useUi } from '@renderer/store/ui'

export function ToastHost(): React.JSX.Element {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle2 size={16} />}
          {t.type === 'error' && <AlertTriangle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          <span>{t.msg}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}