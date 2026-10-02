import React from 'react'
import { formatBytes, formatLength, formatNumber, assetCreditsSpent } from '../../utils/studioFiles'
import { formatCredits } from '../../utils/tripoCredits'
import { TRIPO_MODELS } from '../../utils/tripoEndpoints'
import { MESH_PROFILES } from '../../utils/meshProfiles'

function Stat({ label, value, mono = true }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xs text-slate-200 truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
    </div>
  )
}

export default function StatsPanel({ record, stats, viewKey }) {
  if (!record) return null
  const entry = viewKey ? record.files?.[viewKey] : null
  const b = stats?.bounds
  const dims = b ? `${formatLength(b[0])} × ${formatLength(b[1])} × ${formatLength(b[2])}` : '—'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-2 px-3 py-2 border-t border-slate-800 bg-slate-900/80" data-testid="stats-panel">
      <Stat label="Triangles" value={stats ? formatNumber(stats.triangles) : '—'} />
      <Stat label="Vertices" value={stats ? formatNumber(stats.vertices) : '—'} />
      <Stat label="W × H × D" value={dims} />
      <Stat label="Bones" value={stats ? formatNumber(stats.bones) : '—'} />
      <Stat label="File" value={entry ? formatBytes(entry.bytes) : '—'} />
      <Stat label="Model" value={TRIPO_MODELS[record.modelVersion]?.label?.split(' — ')[0] || record.modelVersion || '—'} mono={false} />
      <Stat label="Profile" value={MESH_PROFILES[record.profile]?.label || record.profile} mono={false} />
      <Stat label="Credits" value={formatCredits(assetCreditsSpent(record))} />
    </div>
  )
}
