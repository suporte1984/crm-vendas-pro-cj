import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
  badge?: string
  className?: string
}

export function KpiCard({ label, value, subtext, icon, badge, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-lg border border-[#e5e7eb] bg-white p-3.5 shadow-sm transition hover:border-[#cbd5e1]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#64748b] uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-[#94a3b8]">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-xl font-semibold tracking-tight text-[#0f172a]">
          {value}
        </span>
        {badge && (
          <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="mt-1 text-[11px] text-[#64748b]">{subtext}</p>}
    </div>
  )
}
