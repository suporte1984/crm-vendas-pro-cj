import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  Filter,
  List,
  MoreHorizontal,
  Plus,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiCard } from '@/components/vendas-pro/KpiCard'
import { StatusBadge } from '@/components/vendas-pro/StatusBadge'
import { EmptyState } from '@/components/vendas-pro/EmptyState'
import { ConfirmDialog } from '@/components/vendas-pro/ConfirmDialog'
import { SaleModal } from '@/components/vendas-pro/SaleModal'
import { SaleDetailModal } from '@/components/vendas-pro/SaleDetailModal'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useCrm } from '@/contexts/CrmContext'
import {
  createSaleWithPayments,
  deleteSale,
  listSalePayments,
  listSales,
  updateSale,
} from '@/services/sales'
import { getAllContracts } from '@/services/contracts'
import { listProducts } from '@/services/leads'
import type { Contract, Product, Sale, SalePayment } from '@/types/vendasPro'
import { exportToCsv, exportToPrintPdf } from '@/lib/vendasProExport'
import { cn } from '@/lib/utils'

export function SalesPage() {
  const { user } = useAuth()
  const { contacts, deals, users } = useCrm()
  const { toast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'mes' | 'lista'>('mes')

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterVendedor, setFilterVendedor] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [salesData, productsData, contractsData] = await Promise.all([
        listSales(),
        listProducts(),
        getAllContracts(),
      ])
      setSales(salesData)
      setProducts(productsData)
      setContracts(contractsData)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar vendas',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // KPIs
  const kpis = useMemo(() => {
    const total = sales.length
    const fechadas = sales.filter((s) => s.status === 'fechada' || s.status === 'paga').length
    const pagas = sales.filter((s) => s.status === 'paga').length

    // Mês atual
    const currentMonth = new Date().toISOString().slice(0, 7)
    const salesThisMonth = sales.filter((s) => (s.data_venda || '').startsWith(currentMonth))

    const valorTotalMes = salesThisMonth.reduce((acc, s) => acc + (s.valor_liquido || 0), 0)
    const comissaoTotalMes = salesThisMonth.reduce((acc, s) => acc + (s.comissao_valor || 0), 0)

    const totalVendidoGeral = sales.reduce((acc, s) => acc + (s.valor_liquido || 0), 0)

    return {
      total,
      fechadas,
      pagas,
      valorTotalMes,
      comissaoTotalMes,
      totalVendidoGeral,
    }
  }, [sales])

  // Filtragem
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filterStatus !== 'todos' && s.status !== filterStatus) return false
      if (filterVendedor !== 'todos' && s.vendedor_id !== filterVendedor) return false
      return true
    })
  }, [sales, filterStatus, filterVendedor])

  // Agrupamento por Mês
  const salesByMonth = useMemo(() => {
    const map = new Map<string, Sale[]>()
    filteredSales.forEach((sale) => {
      const monthKey = sale.data_venda ? sale.data_venda.slice(0, 7) : 'Sem data'
      const list = map.get(monthKey) || []
      list.push(sale)
      map.set(monthKey, list)
    })

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredSales])

  // Salvar Nova Venda
  async function handleCreateSale(data: Parameters<typeof createSaleWithPayments>[0]) {
    try {
      const res = await createSaleWithPayments(data)
      setSales((prev) => [res.sale, ...prev])
      toast({
        title: 'Venda criada com sucesso!',
        description: `${res.payments.length} parcela(s) gerada(s) automaticamente.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar venda',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Excluir Venda
  async function handleDeleteSale() {
    if (!saleToDelete) return
    setDeleteLoading(true)
    const backup = saleToDelete
    setSales((prev) => prev.filter((s) => s.id !== backup.id))

    try {
      await deleteSale(backup.id)
      toast({ title: 'Venda excluída' })
      setSaleToDelete(null)
    } catch (err) {
      setSales((prev) => [backup, ...prev])
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir venda',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Exportação CSV
  function handleExportCsv() {
    const headers = [
      'Número',
      'Cliente',
      'Produto',
      'Data Venda',
      'Valor Bruto',
      'Desconto',
      'Valor Líquido',
      'Status',
      'Vendedor',
      'Parcelas',
      'Comissão',
    ]
    const rows = filteredSales.map((s) => [
      s.numero,
      s.expand?.cliente_id?.name || '',
      s.expand?.produto_id?.nome || 'Avulso',
      s.data_venda ? new Date(s.data_venda).toLocaleDateString('pt-BR') : '',
      `R$ ${s.valor_bruto}`,
      `R$ ${s.desconto || 0}`,
      `R$ ${s.valor_liquido}`,
      s.status,
      s.expand?.vendedor_id?.name || '',
      s.parcelas || 1,
      `R$ ${s.comissao_valor || 0}`,
    ])
    exportToCsv('vendas-vendas-pro', headers, rows)
  }

  // Exportação PDF
  function handleExportPdf() {
    const headers = ['Número', 'Cliente', 'Produto', 'Data', 'Valor Líquido', 'Status', 'Comissão']
    const rows = filteredSales.map((s) => [
      s.numero,
      s.expand?.cliente_id?.name || '',
      s.expand?.produto_id?.nome || 'Avulso',
      new Date(s.data_venda).toLocaleDateString('pt-BR'),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        s.valor_liquido,
      ),
      s.status,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        s.comissao_valor || 0,
      ),
    ])
    exportToPrintPdf('Relatório de Vendas', headers, rows)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#f8fafc] p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold text-[#0f172a]">Vendas</h1>
            <span className="rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-[#475569]">
              {filteredSales.length}
            </span>
          </div>
          <p className="text-[12px] text-[#64748b]">
            Controle financeiro de vendas, parcelamentos mensais e comissionamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternância Mês / Lista */}
          <div className="flex rounded-md border border-[#e2e8f0] bg-white p-0.5">
            <button
              onClick={() => setViewMode('mes')}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition',
                viewMode === 'mes'
                  ? 'bg-[#e2e8f0] text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]',
              )}
            >
              <Calendar className="size-3.5" />
              Por mês
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition',
                viewMode === 'lista'
                  ? 'bg-[#e2e8f0] text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]',
              )}
            >
              <List className="size-3.5" />
              Lista
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-[#e2e8f0] text-[12px]">
                <Download className="mr-1.5 size-3.5 text-[#64748b]" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-[12px]">
              <DropdownMenuItem onClick={handleExportCsv}>Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>Exportar PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-8 bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-700 shadow-xs"
          >
            <Plus className="mr-1.5 size-3.5" />
            Nova Venda
          </Button>
        </div>
      </div>

      {/* Barra de KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total de Vendas"
          value={kpis.total}
          icon={<ShoppingBag className="size-4" />}
        />
        <KpiCard label="Vendas Fechadas" value={kpis.fechadas} badge={`${kpis.pagas} pagas`} />
        <KpiCard
          label="Valor do Mês"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(kpis.valorTotalMes)}
          icon={<DollarSign className="size-4 text-emerald-600" />}
        />
        <KpiCard
          label="Comissões do Mês"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(kpis.comissaoTotalMes)}
          badge="A pagar"
        />
        <KpiCard
          label="Total Geral Vendido"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(kpis.totalVendidoGeral)}
          icon={<TrendingUp className="size-4 text-indigo-600" />}
        />
      </div>

      {/* Barra de Filtros */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white p-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-[#64748b] pl-1 pr-1">
          <Filter className="size-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros:</span>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 w-[140px] text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="em_negociacao">Em Negociação</SelectItem>
            <SelectItem value="fechada">Fechada</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterVendedor} onValueChange={setFilterVendedor}>
          <SelectTrigger className="h-7 w-[150px] text-[11px]">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos vendedores</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo Principal */}
      <div className="mt-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-white border border-[#e2e8f0]"
              />
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Cadastre uma nova venda para gerar faturamento e parcelas."
            actionLabel="Nova Venda"
            onAction={() => setModalOpen(true)}
          />
        ) : viewMode === 'mes' ? (
          /* Visão Agrupada por Mês */
          <div className="space-y-6">
            {salesByMonth.map(([monthKey, monthSales]) => {
              const monthTotal = monthSales.reduce((acc, s) => acc + (s.valor_liquido || 0), 0)
              const [y, m] = monthKey.split('-')
              const monthLabel =
                m && y
                  ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                      new Date(Number(y), Number(m) - 1, 1),
                    )
                  : monthKey

              return (
                <div key={monthKey} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-bold capitalize text-[#1e293b]">
                        {monthLabel}
                      </h3>
                      <span className="rounded bg-[#f1f5f9] px-1.5 py-0.2 font-mono text-[10px] text-[#475569]">
                        {monthSales.length} vendas
                      </span>
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-[#0f172a]">
                      Subtotal:{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(monthTotal)}
                    </span>
                  </div>

                  <SalesTable
                    sales={monthSales}
                    onViewDetail={(s) => {
                      setSelectedSale(s)
                      setDetailModalOpen(true)
                    }}
                    onDelete={(s) => setSaleToDelete(s)}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* Visão Lista corrida */
          <SalesTable
            sales={filteredSales}
            onViewDetail={(s) => {
              setSelectedSale(s)
              setDetailModalOpen(true)
            }}
            onDelete={(s) => setSaleToDelete(s)}
          />
        )}
      </div>

      {/* Modal Nova Venda */}
      <SaleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contacts={contacts}
        products={products}
        contracts={contracts}
        deals={deals}
        users={users}
        onSave={handleCreateSale}
      />

      {/* Modal Detalhes da Venda & Pagamentos */}
      <SaleDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        sale={selectedSale}
        onSaleUpdated={(upd) => {
          setSales((prev) => prev.map((s) => (s.id === upd.id ? upd : s)))
          setSelectedSale(upd)
        }}
      />

      {/* Diálogo de Confirmação para Excluir */}
      <ConfirmDialog
        open={Boolean(saleToDelete)}
        onOpenChange={(v) => !v && setSaleToDelete(null)}
        title="Excluir venda?"
        description={`Tem certeza que deseja excluir a venda "${saleToDelete?.numero}" e todas as suas parcelas associadas?`}
        confirmLabel="Excluir Venda"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteSale}
      />
    </div>
  )
}

function SalesTable({
  sales,
  onViewDetail,
  onDelete,
}: {
  sales: Sale[]
  onViewDetail: (s: Sale) => void
  onDelete: (s: Sale) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
      <table className="w-full text-left text-[12px]">
        <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5">Número</th>
            <th className="px-3 py-2.5">Cliente</th>
            <th className="px-3 py-2.5">Produto</th>
            <th className="px-3 py-2.5">Data</th>
            <th className="px-3 py-2.5 text-right">Valor Líquido</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5 text-right">Comissão</th>
            <th className="px-3 py-2.5">Vendedor</th>
            <th className="px-3 py-2.5">Parcelas</th>
            <th className="px-3 py-2.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f5f9]">
          {sales.map((sale) => (
            <tr key={sale.id} className="h-11 transition hover:bg-[#f8fafc]">
              <td className="px-3 py-2 font-mono font-medium text-[#0f172a]">{sale.numero}</td>
              <td className="px-3 py-2 font-semibold text-[#0f172a]">
                {sale.expand?.cliente_id?.name || 'Cliente removido'}
              </td>
              <td className="px-3 py-2 text-[#475569]">
                {sale.expand?.produto_id?.nome || 'Avulso'}
              </td>
              <td className="px-3 py-2 text-[#64748b]">
                {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-3 py-2 text-right font-mono font-medium text-[#0f172a]">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(sale.valor_liquido)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={sale.status} />
              </td>
              <td className="px-3 py-2 text-right font-mono text-emerald-700 font-medium">
                {sale.comissao_valor
                  ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(sale.comissao_valor)
                  : '—'}
              </td>
              <td className="px-3 py-2 text-[#475569]">{sale.expand?.vendedor_id?.name || '—'}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-[#64748b]">
                {sale.parcelas || 1}x
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(sale)}
                    className="h-7 text-[11px] text-amber-700 hover:bg-amber-50"
                  >
                    <Eye className="mr-1 size-3" /> Detalhes
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-[#64748b]">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 text-[12px]">
                      <DropdownMenuItem onClick={() => onViewDetail(sale)}>
                        Ver Parcelas
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(sale)}
                        className="text-rose-600 focus:text-rose-600"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
