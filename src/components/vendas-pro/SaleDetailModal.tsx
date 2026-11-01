import { useEffect, useState } from 'react'
import { Calendar, CheckCircle2, Clock, History, LoaderCircle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/vendas-pro/StatusBadge'
import { listAuditLogsForEntity } from '@/services/audit'
import { listSalePayments, markPaymentAsPaid } from '@/services/sales'
import type { AuditLog, Sale, SalePayment } from '@/types/vendasPro'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SaleDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale | null
  onSaleUpdated: (updatedSale: Sale) => void
}

export function SaleDetailModal({ open, onOpenChange, sale, onSaleUpdated }: SaleDetailModalProps) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    if (open && sale) {
      setLoading(true)
      Promise.all([listSalePayments(sale.id), listAuditLogsForEntity('sale', sale.id)])
        .then(([p, logs]) => {
          setPayments(p)
          setAuditLogs(logs)
        })
        .catch((err) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar detalhes',
            description: err instanceof Error ? err.message : 'Tente novamente.',
          })
        })
        .finally(() => setLoading(false))
    }
  }, [open, sale])

  async function handleMarkPaid(paymentId: string) {
    setPayingId(paymentId)
    try {
      const res = await markPaymentAsPaid(paymentId)
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? res.payment : p)))
      onSaleUpdated(res.sale)
      toast({
        title: 'Parcela marcada como paga',
        description:
          res.sale.status === 'paga'
            ? 'Todas as parcelas foram pagas! O status da venda mudou para PAGA.'
            : 'Status da parcela atualizado com sucesso.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pagamento',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setPayingId(null)
    }
  }

  if (!sale) return null

  const totalPago = payments
    .filter((p) => p.status === 'pago')
    .reduce((acc, p) => acc + (p.valor || 0), 0)

  const percentPago =
    sale.valor_liquido > 0 ? Math.round((totalPago / sale.valor_liquido) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-[17px] font-semibold text-[#0f172a]">
                Venda {sale.numero}
              </DialogTitle>
              <StatusBadge status={sale.status} />
            </div>
            <span className="font-mono text-[13px] font-bold text-[#0f172a]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                sale.valor_liquido,
              )}
            </span>
          </div>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Cliente: {sale.expand?.cliente_id?.name || '—'} • Data da venda:{' '}
            {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoaderCircle className="size-6 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-4 gap-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 text-[12px]">
              <div>
                <span className="text-[11px] text-[#64748b]">Valor Bruto</span>
                <p className="font-mono font-medium text-[#0f172a]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    sale.valor_bruto,
                  )}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#64748b]">Desconto</span>
                <p className="font-mono font-medium text-rose-600">
                  -{' '}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    sale.desconto || 0,
                  )}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#64748b]">Total Pago</span>
                <p className="font-mono font-medium text-emerald-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalPago,
                  )}{' '}
                  ({percentPago}%)
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#64748b]">Comissão Vendedor</span>
                <p className="font-mono font-medium text-indigo-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    sale.comissao_valor || 0,
                  )}{' '}
                  ({sale.comissao_percentual || 0}%)
                </p>
              </div>
            </div>

            {/* Barra de Progresso de Pagamento */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#64748b]">
                <span>Progresso do recebimento</span>
                <span className="font-mono font-medium text-[#0f172a]">
                  {percentPago}% recebido
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${percentPago}%` }}
                />
              </div>
            </div>

            {/* Lista de Parcelas */}
            <div className="space-y-1.5">
              <h4 className="text-[12px] font-semibold text-[#1e293b]">
                Parcelas ({payments.length})
              </h4>
              <div className="overflow-hidden rounded-lg border border-[#e2e8f0]">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Parcela</th>
                      <th className="px-3 py-2">Vencimento</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Data Pagto</th>
                      <th className="px-3 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {payments.map((p) => (
                      <tr key={p.id} className="h-10 hover:bg-[#f8fafc]">
                        <td className="px-3 py-1.5 font-mono font-medium text-[#0f172a]">
                          {p.numero_parcela}ª parcela
                        </td>
                        <td className="px-3 py-1.5 text-[#475569]">
                          {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-1.5 font-mono font-semibold text-[#0f172a]">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(p.valor)}
                        </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-1.5 text-[#64748b]">
                          {p.data_pagamento
                            ? new Date(p.data_pagamento).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {p.status !== 'pago' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={payingId === p.id}
                              onClick={() => handleMarkPaid(p.id)}
                              className="h-6 border-emerald-300 bg-emerald-50 px-2 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100"
                            >
                              {payingId === p.id ? (
                                <LoaderCircle className="size-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                              )}
                              Marcar como Pago
                            </Button>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-600">
                              Recebido ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Histórico de Alterações / Auditoria */}
            {auditLogs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#f1f5f9]">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1e293b]">
                  <History className="size-3.5 text-[#64748b]" />
                  Histórico de Auditoria
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-[#64748b]">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded bg-[#f8fafc] px-2.5 py-1"
                    >
                      <span>
                        <strong className="text-[#334155] capitalize">
                          {log.acao.replace('_', ' ')}
                        </strong>
                        {log.campo && ` • Campo: ${log.campo}`}
                        {log.valor_anterior &&
                          ` (de: ${log.valor_anterior} → para: ${log.valor_novo})`}
                      </span>
                      <span className="font-mono text-[10px] text-[#94a3b8]">
                        {new Date(log.created).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
