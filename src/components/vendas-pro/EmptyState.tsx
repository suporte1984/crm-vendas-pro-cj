import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#e2e8f0] bg-white/50 px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-[#f8fafc] text-[#94a3b8] shadow-xs">
        {icon || <Inbox className="size-5" />}
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-[#1e293b]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] text-[#64748b] leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-4 h-8 bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-700 shadow-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
