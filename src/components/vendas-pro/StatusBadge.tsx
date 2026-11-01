import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Leads
  novo: { label: 'Novo', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  em_negociacao: {
    label: 'Em Negociação',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  convertido: {
    label: 'Convertido',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  perdido: { label: 'Perdido', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },

  // Contratos
  rascunho: {
    label: 'Rascunho',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
  ativo: { label: 'Ativo', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  suspenso: {
    label: 'Suspenso',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  encerrado: {
    label: 'Encerrado',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },

  // Vendas
  fechada: {
    label: 'Fechada',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  paga: { label: 'Paga', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },

  // Pagamentos
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  pago: { label: 'Pago', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  atrasado: {
    label: 'Atrasado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },

  // Tarefas
  em_andamento: {
    label: 'Em andamento',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  concluida: {
    label: 'Concluída',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },

  // Prioridades
  baixa: { label: 'Baixa', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  media: { label: 'Média', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  alta: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  urgente: { label: 'Urgente', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = (status || '').toLowerCase().replace(/\s+/g, '_')
  const config = statusConfig[norm] || {
    label: status || '—',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition',
        config.bg,
        config.text,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
