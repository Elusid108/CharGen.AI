import React from 'react'
import { Microscope, Lightbulb } from 'lucide-react'

export default function ContextPanel({ contextInfo }) {
  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 hidden xl:flex flex-col p-6 overflow-y-auto shrink-0">
      <div className="sticky top-0 space-y-6">
        <h3 className="section-heading flex items-center gap-2">
          <Microscope size={14} />
          Analysis
        </h3>

        {/* Main Definition */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 animate-fade-in">
          <h4 className="text-blue-400 font-semibold mb-2 text-sm">
            {contextInfo.title || 'Select an attribute'}
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            {contextInfo.description || 'Hover over or change any field to see detailed definitions here.'}
          </p>
        </div>

        {/* Roleplay Tip */}
        {contextInfo.tip && (
          <div className="p-4 bg-emerald-900/10 rounded-lg border border-emerald-900/30 animate-fade-in">
            <h4 className="text-emerald-500 font-bold mb-2 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Lightbulb size={12} />
              Roleplay Tip
            </h4>
            <p className="text-slate-400 text-xs italic leading-relaxed">
              {contextInfo.tip}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        {contextInfo.stats && (
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <h4 className="text-slate-500 font-bold mb-3 text-xs uppercase tracking-wide">Quick Stats</h4>
            <div className="space-y-2">
              {contextInfo.stats.map((stat, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-500">{stat.label}</span>
                  <span className="text-slate-300 font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
