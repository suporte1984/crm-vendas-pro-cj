import React from 'react'
import { cn } from '@/lib/utils'

interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: number
  onChange: (value: number) => void
  label?: string
  error?: string
}

export function MoneyInput({
  value,
  onChange,
  label,
  error,
  className,
  id,
  disabled,
  ...props
}: MoneyInputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const num = Number(raw) / 100
    onChange(num)
  }

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-[12px] font-medium text-[#475569]">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[12px] font-medium text-[#94a3b8]">
          R$
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={formatted}
          onChange={handleChange}
          className={cn(
            'h-8 w-full rounded-md border border-[#e2e8f0] bg-white pl-8 pr-2.5 text-right font-mono text-[12px] text-[#0f172a] shadow-xs outline-hidden transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-50',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}
