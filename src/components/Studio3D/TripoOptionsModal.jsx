import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { formatCredits } from '../../utils/tripoCredits'
import { JOB_COPY, JOB_KIND_LABELS, applyJobValue, fieldOptions, jobEstimate, visibleFields } from '../../utils/tripoJobSchemas'

function Field({ field, value, ctx, onChange }) {
  const options = fieldOptions(field, ctx)
  switch (field.type) {
    case 'note':
      return <p className="text-[11px] text-slate-400 bg-slate-800/40 border border-slate-700 rounded-lg p-2">{field.text}</p>
    case 'radio':
      if (field.inline) {
        return (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{field.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange(o.id)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${value === o.id ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-100' : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {field.hint ? <p className="text-[11px] text-slate-500 mt-1">{field.hint}</p> : null}
          </div>
        )
      }
      return (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{field.label}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {options.map((o) => (
              <label
                key={o.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer ${value === o.id ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'}`}
              >
                <input type="radio" className="mt-1" checked={value === o.id} onChange={() => onChange(o.id)} />
                <span>
                  <span className="block text-sm font-medium text-white">{o.label}</span>
                  {o.hint ? <span className="block text-[11px] text-slate-400">{o.hint}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </div>
      )
    case 'select':
      return (
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1">{field.label}</span>
          <select className="input-field text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {(() => {
            const picked = options.find((o) => o.id === value)
            return picked?.hint || field.hint ? <span className="text-[11px] text-slate-500 block mt-1">{picked?.hint || field.hint}</span> : null
          })()}
        </label>
      )
    case 'toggle':
      return (
        <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>
            <span className="block">{field.label}</span>
            {field.hint ? <span className="block text-[11px] text-slate-500">{field.hint}</span> : null}
          </span>
        </label>
      )
    case 'range': {
      const r = typeof field.range === 'function' ? field.range({}) : { min: field.min ?? 0, max: field.max ?? 100 }
      return (
        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{field.label}</span>
            <span className="font-mono text-slate-200">{value}</span>
          </label>
          <input type="range" min={r.min} max={r.max} step={field.step || 1} value={Number(value) || r.min} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
          {field.hint ? <p className="text-[11px] text-slate-500 mt-1">{field.hint}</p> : null}
        </div>
      )
    }
    case 'number':
      return (
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1">{field.label}</span>
          <input type="number" className="input-field text-sm" value={value ?? ''} min={field.min} max={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {field.hint ? <span className="text-[11px] text-slate-500 block mt-1">{field.hint}</span> : null}
        </label>
      )
    case 'textarea':
      return (
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1">{field.label}</span>
          <textarea className="input-field text-sm min-h-[72px]" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {field.hint ? <span className="text-[11px] text-slate-500 block mt-1">{field.hint}</span> : null}
        </label>
      )
    case 'text':
      return (
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1">{field.label}</span>
          <input type="text" className="input-field text-sm" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {field.hint ? <span className="text-[11px] text-slate-500 block mt-1">{field.hint}</span> : null}
        </label>
      )
    case 'multiselect': {
      const picked = Array.isArray(value) ? value : []
      const groups = field.groups || [null]
      const toggle = (id) => {
        if (picked.includes(id)) onChange(picked.filter((x) => x !== id))
        else if (!field.max || picked.length < field.max) onChange([...picked, id])
      }
      return (
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{field.label}</span>
            {field.max ? <span className="text-[11px] text-slate-500 font-mono">{picked.length}/{field.max}</span> : null}
          </div>
          {groups.map((g) => {
            const rows = options.filter((o) => (g ? o.group === g : true))
            if (!rows.length) return null
            return (
              <div key={g || 'all'} className="mb-2">
                {g ? <p className="text-[10px] text-slate-600 capitalize mb-1">{g}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {rows.map((o) => {
                    const on = picked.includes(o.id)
                    const full = !on && field.max && picked.length >= field.max
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={full}
                        onClick={() => toggle(o.id)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors disabled:opacity-40 ${on ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-100' : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500'}`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {field.hint ? <p className="text-[11px] text-slate-500">{field.hint}</p> : null}
        </div>
      )
    }
    default:
      return null
  }
}

export default function TripoOptionsModal({ open, kind, ctx, initialValues, balance, onCancel, onConfirm }) {
  const [values, setValues] = useState(initialValues || {})
  useEffect(() => {
    setValues(initialValues || {})
  }, [initialValues, kind])

  const fields = useMemo(() => (kind ? visibleFields(kind, values, ctx || {}) : []), [kind, values, ctx])
  const estimate = useMemo(() => (kind ? jobEstimate(kind, values, ctx || {}) : { credits: 0, approx: true, notes: [] }), [kind, values, ctx])
  if (!open || !kind) return null

  const copy = (JOB_COPY[kind] || (() => ({})))(ctx || {})
  const available = balance?.balance
  const short = available != null && estimate.credits != null && available < estimate.credits
  const update = (fieldId, v) => setValues((prev) => applyJobValue(kind, prev, fieldId, v))

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">{JOB_KIND_LABELS[kind]}</p>
            <h3 className="text-lg font-bold text-white">{copy.title || JOB_KIND_LABELS[kind]}</h3>
            {copy.description ? <p className="text-xs text-slate-400 mt-1">{copy.description}</p> : null}
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {fields.map((f) => (
            <Field key={f.id} field={f} value={values[f.id]} ctx={ctx} onChange={(v) => update(f.id, v)} />
          ))}
        </div>

        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-sm space-y-1 mb-3">
          <div className="flex justify-between">
            <span className="text-slate-400">Estimated cost</span>
            <span className="text-white font-mono" data-testid="tripo-estimate">
              {estimate.approx ? '≈' : '~'}{formatCredits(estimate.credits)} credits
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tripo balance</span>
            <span className="text-white font-mono">
              {available == null ? '—' : `${formatCredits(available)} available`}
              {balance?.frozen ? ` · ${formatCredits(balance.frozen)} frozen` : ''}
            </span>
          </div>
          {estimate.approx ? <p className="text-[11px] text-slate-500">Tripo does not publish a fixed price for this operation; the real charge is read back from the task.</p> : null}
          <p className="text-[11px] text-slate-500 pt-1">Failed jobs return frozen credits. Results are downloaded into this browser immediately.</p>
        </div>

        {estimate.notes.map((n) => (
          <p key={n} className="text-xs text-amber-400 mb-2 flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{n}</p>
        ))}
        {short && (
          <p className="text-xs text-amber-400 mb-3">Balance looks lower than this estimate. Top up in the Tripo console if the request is rejected.</p>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          <button type="button" onClick={() => onConfirm(values)} className="btn-primary text-sm" data-testid="tripo-confirm">
            {copy.confirmLabel || 'Spend credits'}
          </button>
        </div>
      </div>
    </div>
  )
}
