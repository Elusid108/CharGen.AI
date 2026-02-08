import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore } from '../../hooks/useToast'

const ICON_MAP = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
}

const COLOR_MAP = {
  success: 'border-emerald-500 text-emerald-400',
  error: 'border-red-500 text-red-400',
  warning: 'border-amber-500 text-amber-400',
  info: 'border-blue-500 text-blue-400',
}

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => {
        const Icon = ICON_MAP[toast.type] || Info
        const colors = COLOR_MAP[toast.type] || COLOR_MAP.info

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-md border-l-4 ${colors} rounded-lg shadow-2xl animate-slide-in min-w-[280px] max-w-[400px]`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm text-slate-200 flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
