import { useEffect, useMemo, useState } from 'react'
import {
  BadgePercent,
  CalendarRange,
  Download,
  Loader2,
  Percent,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/vendas-pro/EmptyState'
import { KpiCard } from '@/components/vendas-pro/KpiCard'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getAllContracts } from '@/services/contracts'
import { listSales } from '@/services/sales'
import type { Contract, Sale } from '@/types/vendasPro'
import { exportToCsv, exportToPrintPdf } from '@/lib/vendasProExport'
import { computeSaleCommission, filterSalesByPeriod } from '@/lib/vendasProMetrics'
import { cn } from '@/lib/utils'

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

function buildPeriodOptions() {
  const now = new Date()
  const options: { value: string; label: string; start: string; end: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    options.push({
      value: `month-${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }
  options.push({
    value: 'year-current',
    label: `Ano ${now.getFullYear()}`,
    start: new Date(now.getFullYear(), 0, 1).toISOString(),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
  })
  options.push({
    value: 'year-previous',
    label: `Ano ${now.getFullYear() - 1}`,
    start: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
    end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString(),
  })
  options.push({
    value: 'all',
    label: 'Todo o período',
    start: '2000-01-01T00:00:00.000Z',
    end: '2999-12-31T23:59:59.999Z',
  })
  return options
}

const PERIOD_OPTIONS = buildPeriodOptions()

interface CommissionRow {
  vendedorId: string
  vendedorNome: string
  qtdVendas: number
  valorVendido: number
  comissaoVendas: number
  comissaoContratos: number
  comissaoTotal: number
  comissaoMedia: number
}

export function CommissionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  // Padrão: ano atual — a página abre somando apenas os registros do ano corrente.
  const [periodValue, setPeriodValue] = useState(
    PERIOD_OPTIONS.find((p) => p.value === 'year-current')?.value || 'all',
  )

  const isManager = user?.role === 'admin' || user?.role === 'gestor'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // A API já aplica o escopo: vendedor só recebe as próprias vendas/contratos.
        const [salesData, contractsData] = await Promise.all([listSales(), getAllContracts()])
        if (cancelled) return
        setSales(salesData)
        setContracts(contractsData)
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar comissões',
          description: err instanceof Error ? err.message : 'Tente novamente.',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  const period =
    PERIOD_OPTIONS.find((p) => p.value === periodValue) ||
    PERIOD_OPTIONS.find((p) => p.value === 'all') ||
    PERIOD_OPTIONS[0]

  const rows = useMemo<CommissionRow[]>(() => {
    const periodSales = filterSalesByPeriod(sales, period.start, period.end).filter(
      (s) => s.status !== 'cancelada',
    )
    const contractBySale = new Map<string, Contract[]>()
    for (const c of contracts) {
      if (!c.venda_id) continue
      const list = contractBySale.get(c.venda_id) || []
      list.push(c)
      contractBySale.set(c.venda_id, list)
    }

    const map = new Map<string, CommissionRow>()
    for (const sale of periodSales) {
      const id = sale.vendedor_id || sale.owner || 'sem-vendedor'
      const nome = sale.expand?.vendedor_id?.name || sale.expand?.owner?.name || 'Sem vendedor'
      const linkedContracts = contractBySale.get(sale.id) || []
      const comissaoContratos = linkedContracts.reduce(
        (acc, c) => acc + (Number(c.comissao_valor) || 0),
        0,
      )
      const comissaoVendas = Number(sale.comissao_valor) || 0

      const entry =
        map.get(id) ||
        ({
          vendedorId: id,
          vendedorNome: nome,
          qtdVendas: 0,
          valorVendido: 0,
          comissaoVendas: 0,
          comissaoContratos: 0,
          comissaoTotal: 0,
          comissaoMedia: 0,
        } satisfies CommissionRow)

      entry.qtdVendas += 1
      entry.valorVendido += Number(sale.valor_liquido) || 0
      entry.comissaoVendas += comissaoVendas
      entry.comissaoContratos += comissaoContratos
      entry.comissaoTotal += computeSaleCommission(sale, linkedContracts[0])
      map.set(id, entry)
    }

    return [...map.values()]
      .map((r) => ({
        ...r,
        comissaoMedia: r.qtdVendas > 0 ? r.comissaoTotal / r.qtdVendas : 0,
      }))
      .sort((a, b) => b.comissaoTotal - a.comissaoTotal)
  }, [sales, contracts, period])

  const totals = useMemo(() => {
    const comissaoTotal = rows.reduce((acc, r) => acc + r.comissaoTotal, 0)
    const valorVendido = rows.reduce((acc, r) => acc + r.valorVendido, 0)
    const qtdVendas = rows.reduce((acc, r) => acc + r.qtdVendas, 0)
    return {
      comissaoTotal: Math.round(comissaoTotal * 100) / 100,
      valorVendido: Math.round(valorVendido * 100) / 100,
      qtdVendas,
      percentualMedio: valorVendido > 0 ? (comissaoTotal / valorVendido) * 100 : 0,
    }
  }, [rows])

  function handleExportCsv() {
    if (rows.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Sem comissões no período.' })
      return
    }
    exportToCsv(
      'comissoes-vendas-pro',
      [
        'Vendedor',
        'Vendas',
        'Valor Vendido',
        'Comissão Vendas',
        'Comissão Contratos',
        'Comissão Total',
        'Comissão Média por Venda',
      ],
      rows.map((r) => [
        r.vendedorNome,
        r.qtdVendas,
        r.valorVendido.toFixed(2),
        r.comissaoVendas.toFixed(2),
        r.comissaoContratos.toFixed(2),
        r.comissaoTotal.toFixed(2),
        r.comissaoMedia.toFixed(2),
      ]),
    )
    toast({ title: 'CSV exportado' })
  }

  function handleExportPdf() {
    exportToPrintPdf(
      'Relatório de Comissões',
      [
        'Vendedor',
        'Vendas',
        'Valor Vendido',
        'Comissão Vendas',
        'Comissão Contratos',
        'Comissão Total',
      ],
      rows.map((r) => [
        r.vendedorNome,
        r.qtdVendas,
        formatMoney(r.valorVendido),
        formatMoney(r.comissaoVendas),
        formatMoney(r.comissaoContratos),
        formatMoney(r.comissaoTotal),
      ]),
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-[#64748b]">
        <Loader2 className="size-4 animate-spin" /> Carregando comissões…
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-amber-600">
              Vendas PRO
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-[-.035em] text-[#1c1c1e]">
              Comissões
            </h1>
            <p className="mt-1 text-xs text-[#64748b]">
              Comissionamento por vendedor no período, somando a comissão da venda e do contrato
              vinculado.
            </p>
            {!isManager && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-[#64748b]">
                <ShieldCheck className="size-3" />
                Você está vendo apenas as suas próprias comissões.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodValue} onValueChange={setPeriodValue}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <CalendarRange className="size-3.5 text-[#64748b]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCsv}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportPdf}>
              <Download className="size-3.5" /> PDF
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BadgePercent className="size-5" />}
              title="Sem comissões no período"
              description="Não há comissões calculadas no período selecionado. Registre vendas com percentual de comissão para vê-las aqui."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Comissão total do período"
                value={formatMoney(totals.comissaoTotal)}
                icon={<BadgePercent className="size-4" />}
                subtext={`${totals.qtdVendas} venda(s)`}
              />
              <KpiCard
                label="Valor vendido"
                value={formatMoney(totals.valorVendido)}
                subtext="Base de cálculo das comissões"
                icon={<TrendingUp className="size-4" />}
              />
              <KpiCard
                label="Percentual médio"
                value={`${totals.percentualMedio.toFixed(1)}%`}
                subtext="Comissão / valor vendido"
                icon={<Percent className="size-4" />}
              />
              <KpiCard
                label="Vendedores"
                value={String(rows.length)}
                subtext={isManager ? 'Todo o time' : 'Apenas você'}
                icon={<Users className="size-4" />}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-xs">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f8fafc] text-[9px] uppercase tracking-[.08em] text-[#64748b]">
                    <th className="px-4 py-2.5 font-semibold">Vendedor</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Vendas</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Valor vendido</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Com. vendas</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Com. contratos</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Comissão total</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Média / venda</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.vendedorId} className="border-b border-[#f1f5f9] last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#1c1c1e]">{r.vendedorNome}</td>
                      <td className="px-4 py-2.5 text-right text-[#64748b]">{r.qtdVendas}</td>
                      <td className="px-4 py-2.5 text-right text-[#64748b]">
                        {formatMoney(r.valorVendido)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#64748b]">
                        {formatMoney(r.comissaoVendas)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#64748b]">
                        {formatMoney(r.comissaoContratos)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1c1c1e]">
                        {formatMoney(r.comissaoTotal)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#64748b]">
                        {formatMoney(r.comissaoMedia)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#e5e7eb] bg-[#f8fafc]">
                    <td className="px-4 py-2.5 font-bold text-[#1c1c1e]">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1c1c1e]">
                      {totals.qtdVendas}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1c1c1e]">
                      {formatMoney(totals.valorVendido)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1c1c1e]">
                      {formatMoney(rows.reduce((a, r) => a + r.comissaoVendas, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1c1c1e]">
                      {formatMoney(rows.reduce((a, r) => a + r.comissaoContratos, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-amber-600">
                      {formatMoney(totals.comissaoTotal)}
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
