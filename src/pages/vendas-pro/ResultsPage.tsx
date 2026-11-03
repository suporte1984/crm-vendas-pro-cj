import { useMemo, useState, useEffect } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Download,
  DollarSign,
  Loader2,
  Percent,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiCard } from '@/components/vendas-pro/KpiCard'
import { EmptyState } from '@/components/vendas-pro/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { useCrm } from '@/contexts/CrmContext'
import { getAllContracts } from '@/services/contracts'
import { listSalePayments, listSales } from '@/services/sales'
import { listLeads } from '@/services/leads'
import type { Contract, Lead, Sale, SalePayment } from '@/types/vendasPro'
import { exportToCsv, exportToPrintPdf } from '@/lib/vendasProExport'
import {
  computeCashflowByMonth,
  computeOverdue,
  computeSalesMetrics,
  filterContractsByPeriod,
  filterSalesByPeriod,
  sumBy,
} from '@/lib/vendasProMetrics'
import { cn } from '@/lib/utils'

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

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  const idx = Number(m) - 1
  if (Number.isNaN(idx) || !MONTH_NAMES[idx]) return key
  return `${MONTH_NAMES[idx]} ${y.slice(2)}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

/** Opções de período: últimos 12 meses + ano atual + ano anterior + tudo. */
function buildPeriodOptions() {
  const now = new Date()
  const options: { value: string; label: string; start: string; end: string }[] = []

  // Últimos 6 meses (incluindo o atual)
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

function usePeriodData(periodValue: string) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [salesData, contractsData, paymentsData, leadsData] = await Promise.all([
          listSales(),
          getAllContracts(),
          listSalePaymentsAll(),
          listLeads(),
        ])
        if (cancelled) return
        setSales(salesData)
        setContracts(contractsData)
        setPayments(paymentsData)
        setLeads(leadsData)
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar resultados',
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

  const data = useMemo(() => {
    const periodSales = filterSalesByPeriod(sales, period.start, period.end)
    const periodContracts = filterContractsByPeriod(contracts, period.start, period.end)

    const periodPaymentIds = new Set(periodSales.map((s) => s.id))
    const periodPayments = payments.filter((p) => periodPaymentIds.has(p.sale_id))

    const metrics = computeSalesMetrics(periodSales, periodContracts, 0)

    // Evolução mês a mês dentro do período selecionado
    const salesByMonth = new Map<string, Sale[]>()
    for (const sale of periodSales) {
      const key = (sale.data_venda || '').slice(0, 7)
      if (!key) continue
      const list = salesByMonth.get(key) || []
      list.push(sale)
      salesByMonth.set(key, list)
    }
    const series = [...salesByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({
        key,
        label: monthLabel(key),
        valor: sumBy(list, (s) => s.valor_liquido || 0),
        comissao: sumBy(list, (s) => s.comissao_valor || 0),
        qtd: list.length,
      }))

    const leadsByOrigem = new Map<string, number>()
    for (const lead of leads) {
      const origem = lead.origem || 'outro'
      leadsByOrigem.set(origem, (leadsByOrigem.get(origem) || 0) + 1)
    }

    const cashflow = computeCashflowByMonth(periodPayments)
    const overdue = computeOverdue(payments)

    const vendedoresMap = new Map<string, { nome: string; valor: number; qtd: number }>()
    for (const sale of periodSales) {
      const id = sale.vendedor_id || 'sem-vendedor'
      const nome = sale.expand?.vendedor_id?.name || sale.expand?.owner?.name || 'Sem vendedor'
      const entry = vendedoresMap.get(id) || { nome, valor: 0, qtd: 0 }
      entry.valor += sale.valor_liquido || 0
      entry.qtd += 1
      vendedoresMap.set(id, entry)
    }
    const vendedores = [...vendedoresMap.values()].sort((a, b) => b.valor - a.valor)

    return {
      metrics,
      series,
      leadsByOrigem,
      leadsCount: leads.length,
      cashflow,
      overdue,
      vendedores,
      periodSales,
      periodContracts,
      periodPayments,
    }
  }, [sales, contracts, payments, leads, period])

  return { loading, ...data }
}

/** Busca todas as parcelas usando paginação do PocketBase. */
async function listSalePaymentsAll(): Promise<SalePayment[]> {
  const out: SalePayment[] = []
  let page = 1
  // Per-page alto para reduzir o número de chamadas, com fallback para paginar de verdade.
  const first = await listSalePaymentsPage(page, 500)
  out.push(...first.items)
  while (out.length < first.totalItems && page < 20) {
    page++
    const next = await listSalePaymentsPage(page, 500)
    out.push(...next.items)
    if (next.items.length === 0) break
  }
  return out
}

async function listSalePaymentsPage(page: number, perPage: number) {
  const pb = (await import('@/lib/pocketbase/client')).default
  return pb.collection<SalePayment>('sale_payments').getList(page, perPage, { sort: '+vencimento' })
}

export function ResultsPage() {
  const { toast } = useToast()
  const [periodValue, setPeriodValue] = useState<string>(PERIOD_OPTIONS[0].value)
  const { loading, metrics, series, cashflow, overdue, vendedores, periodSales, leadsCount } =
    usePeriodData(periodValue)
  const totalLeads = leadsCount

  const maxSeriesValue = Math.max(1, ...series.map((s) => s.valor))

  function handleExportCsv() {
    if (periodSales.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Sem vendas no período selecionado.' })
      return
    }
    exportToCsv(
      'resultados-vendas-pro',
      [
        'Número',
        'Data',
        'Cliente',
        'Produto',
        'Vendedor',
        'Valor Bruto',
        'Desconto',
        'Valor Líquido',
        'Comissão',
        'Status',
      ],
      periodSales.map((s) => [
        s.numero,
        (s.data_venda || '').slice(0, 10),
        s.expand?.cliente_id?.name || '-',
        s.expand?.produto_id?.nome || '-',
        s.expand?.vendedor_id?.name || '-',
        s.valor_bruto,
        s.desconto || 0,
        s.valor_liquido,
        s.comissao_valor || 0,
        s.status,
      ]),
    )
    toast({ title: 'CSV exportado' })
  }

  function handleExportPdf() {
    const label = PERIOD_OPTIONS.find((p) => p.value === periodValue)?.label || '-'
    exportToPrintPdf(
      'Resultados Comerciais',
      ['Indicador', 'Valor'],
      [
        ['Período', label],
        ['Faturamento bruto', formatMoney(metrics.faturamentoBruto)],
        ['Faturamento líquido', formatMoney(metrics.faturamentoLiquido)],
        ['Descontos concedidos', formatMoney(metrics.descontos)],
        ['Ticket médio', formatMoney(metrics.ticketMedio)],
        ['Vendas no período', String(metrics.qtdVendas)],
        ['Vendas pagas', String(metrics.qtdPagas)],
        ['Comissões acumuladas', formatMoney(metrics.comissaoTotal)],
        ['Parcelas em atraso (geral)', formatMoney(overdue)],
      ],
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-[#64748b]">
        <Loader2 className="size-4 animate-spin" /> Carregando resultados…
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
              Resultados
            </h1>
            <p className="mt-1 text-xs text-[#64748b]">
              Desempenho comercial do período, calculado sobre vendas, contratos, leads e parcelas
              reais do banco.
            </p>
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

        {metrics.qtdVendas === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BarChart3 className="size-5" />}
              title="Sem vendas no período"
              description="Não houve vendas registradas no período selecionado. Tente outro período ou registre uma venda em Vendas."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Faturamento líquido"
                value={formatMoney(metrics.faturamentoLiquido)}
                icon={<DollarSign className="size-4" />}
                subtext={`${metrics.qtdVendas} vendas no período`}
              />
              <KpiCard
                label="Ticket médio"
                value={formatMoney(metrics.ticketMedio)}
                icon={<Target className="size-4" />}
                subtext="Média por venda"
              />
              <KpiCard
                label="Comissões acumuladas"
                value={formatMoney(metrics.comissaoTotal)}
                icon={<Percent className="size-4" />}
                subtext="Sobre vendas do período"
              />
              <KpiCard
                label="Parcelas em atraso"
                value={formatMoney(overdue)}
                icon={<AlertTriangle className="size-4" />}
                subtext="Todas as vendas (valor em aberto vencido)"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Faturamento bruto"
                value={formatMoney(metrics.faturamentoBruto)}
                icon={<TrendingUp className="size-4" />}
                subtext={`Descontos: ${formatMoney(metrics.descontos)}`}
              />
              <KpiCard
                label="Vendas pagas"
                value={`${metrics.qtdPagas}/${metrics.qtdVendas}`}
                icon={<ShoppingCart className="size-4" />}
                subtext="Parcelas totalmente quitadas"
              />
              <KpiCard
                label="Leads cadastrados"
                value={String(totalLeads)}
                icon={<Users className="size-4" />}
                subtext="Total geral"
              />
              <KpiCard
                label="ROAS estimado"
                value={metrics.roas !== null ? `${metrics.roas.toFixed(2)}x` : '—'}
                icon={<Wallet className="size-4" />}
                subtext={
                  metrics.roas !== null
                    ? 'Faturamento líquido / investimento'
                    : 'Sem investimento em anúncios no banco'
                }
              />
            </div>

            {/* Evolução mensal */}
            <section className="mt-6 rounded-md border border-[#e5e7eb] bg-white shadow-xs">
              <div className="border-b border-[#e5e7eb] px-4 py-3">
                <h2 className="text-xs font-extrabold text-[#1c1c1e]">Evolução por mês</h2>
                <p className="mt-1 text-[10px] text-[#64748b]">
                  Faturamento líquido e comissões por mês de data_venda.
                </p>
              </div>
              <div className="p-4">
                {series.length === 0 ? (
                  <p className="text-[11px] text-[#64748b]">Sem vendas no período.</p>
                ) : (
                  <>
                    <div className="flex items-end gap-2 overflow-x-auto pb-2">
                      {series.map((point) => (
                        <div
                          key={point.key}
                          className="flex w-16 shrink-0 flex-col items-center gap-1"
                        >
                          <span className="text-[9px] font-semibold text-[#1c1c1e]">
                            {point.valor >= 1000
                              ? `${Math.round(point.valor / 1000)}k`
                              : Math.round(point.valor)}
                          </span>
                          <div
                            className="w-full rounded-t bg-amber-500/80"
                            style={{
                              height: `${Math.max(4, (point.valor / maxSeriesValue) * 120)}px`,
                            }}
                            title={`${point.label}: ${formatMoney(point.valor)}`}
                          />
                          <span className="text-[9px] text-[#64748b]">{point.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-1 text-[10px] text-[#64748b] sm:grid-cols-2">
                      {series.map((point) => (
                        <div key={point.key} className="flex items-center justify-between gap-2">
                          <span>{point.label}</span>
                          <span className="text-[#1c1c1e]">
                            {formatMoney(point.valor)} · {point.qtd} venda(s) · comiss.{' '}
                            {formatMoney(point.comissao)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Fluxo de caixa */}
              <section className="rounded-md border border-[#e5e7eb] bg-white shadow-xs">
                <div className="border-b border-[#e5e7eb] px-4 py-3">
                  <h2 className="text-xs font-extrabold text-[#1c1c1e]">
                    Fluxo de caixa (recebido)
                  </h2>
                  <p className="mt-1 text-[10px] text-[#64748b]">
                    Parcelas com status &quot;pago&quot; agrupadas por vencimento.
                  </p>
                </div>
                <div className="p-4">
                  {cashflow.size === 0 ? (
                    <p className="text-[11px] text-[#64748b]">Nenhuma parcela paga ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...cashflow.entries()]
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 6)
                        .map(([key, valor]) => (
                          <div key={key} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#64748b]">{monthLabel(key)}</span>
                            <span className="font-semibold text-[#1c1c1e]">
                              {formatMoney(valor)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Por vendedor */}
              <section className="rounded-md border border-[#e5e7eb] bg-white shadow-xs">
                <div className="border-b border-[#e5e7eb] px-4 py-3">
                  <h2 className="text-xs font-extrabold text-[#1c1c1e]">Por vendedor</h2>
                  <p className="mt-1 text-[10px] text-[#64748b]">
                    Ranking de faturamento líquido das vendas do período.
                  </p>
                </div>
                <div className="p-4">
                  {vendedores.length === 0 ? (
                    <p className="text-[11px] text-[#64748b]">Sem vendas no período.</p>
                  ) : (
                    <div className="space-y-2">
                      {vendedores.map((v) => {
                        const total = vendedores.reduce((acc, x) => acc + x.valor, 0) || 1
                        const pct = Math.round((v.valor / total) * 100)
                        return (
                          <div key={v.nome} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-[#1c1c1e]">{v.nome}</span>
                              <span className="text-[#64748b]">
                                {formatMoney(v.valor)} · {v.qtd} venda(s) · {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                              <div
                                className={cn('h-full rounded-full bg-amber-500')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">
              Nota: métricas de anúncio da referência (impressões, cliques, investimento em mídia)
              não existem no banco do CRM — existem apenas no simulador de campanhas. O ROAS aqui é
              exibido somente quando houver investimento registrado; caso contrário fica em
              &quot;—&quot;. Todos os demais números vêm de vendas, contratos, leads e parcelas
              reais.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
