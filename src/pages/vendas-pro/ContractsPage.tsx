import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Building,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ContractModal } from '@/components/vendas-pro/ContractModal'
import { MigrateLeadsModal } from '@/components/vendas-pro/MigrateLeadsModal'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useCrm } from '@/contexts/CrmContext'
import {
  createContract,
  deleteContract,
  duplicateContract,
  getAllContracts,
  getConvertedLeadsWithoutContract,
  migrateLeadsToContracts,
  updateContract,
} from '@/services/contracts'
import { listProducts } from '@/services/leads'
import { listSales } from '@/services/sales'
import type { Contract, ContractStatus, Lead, Product, Sale } from '@/types/vendasPro'
import { exportToCsv, exportToPrintPdf } from '@/lib/vendasProExport'
import { cn } from '@/lib/utils'

export function ContractsPage() {
  const { user } = useAuth()
  const { contacts, users } = useCrm()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [convertedLeads, setConvertedLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros persistidos na URL
  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || 'todos'
  const clientFilter = searchParams.get('cliente') || 'todos'
  const productFilter = searchParams.get('produto') || 'todos'
  const hasSaleFilter = searchParams.get('venda') || 'todos'

  // Paginação e Ordenação
  const [sortField, setSortField] = useState<string>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const perPage = 15

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  const [migrateModalOpen, setMigrateModalOpen] = useState(false)

  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Alerta de encerramento com venda vinculada
  const [contractToClose, setContractToClose] = useState<Contract | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [contractsData, productsData, salesData, leadsToMigrate] = await Promise.all([
        getAllContracts(),
        listProducts(),
        listSales(),
        getConvertedLeadsWithoutContract(),
      ])
      setContracts(contractsData)
      setProducts(productsData)
      setSales(salesData)
      setConvertedLeads(leadsToMigrate)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar contratos',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Atualizar URL params
  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'todos') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setSearchParams(next)
    setPage(1)
  }

  // KPIs
  const kpis = useMemo(() => {
    const total = contracts.length
    const ativos = contracts.filter((c) => c.status === 'ativo').length
    const comVenda = contracts.filter((c) => Boolean(c.venda_id)).length
    const percentComVenda = total > 0 ? Math.round((comVenda / total) * 100) : 0
    const valorTotal = contracts.reduce((acc, c) => acc + (c.valor_total || 0), 0)
    const comissaoTotal = contracts.reduce((acc, c) => acc + (c.comissao_valor || 0), 0)

    return { total, ativos, comVenda, percentComVenda, valorTotal, comissaoTotal }
  }, [contracts])

  // Filtragem
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Busca textual
      if (search) {
        const q = search.toLowerCase()
        const matchNum = c.numero.toLowerCase().includes(q)
        const matchClient = (c.expand?.cliente_id?.name || '').toLowerCase().includes(q)
        const matchProd = (c.expand?.produto_id?.nome || '').toLowerCase().includes(q)
        if (!matchNum && !matchClient && !matchProd) return false
      }

      if (statusFilter !== 'todos' && c.status !== statusFilter) return false
      if (clientFilter !== 'todos' && c.cliente_id !== clientFilter) return false
      if (productFilter !== 'todos' && c.produto_id !== productFilter) return false
      if (hasSaleFilter === 'sim' && !c.venda_id) return false
      if (hasSaleFilter === 'nao' && c.venda_id) return false

      return true
    })
  }, [contracts, search, statusFilter, clientFilter, productFilter, hasSaleFilter])

  // Ordenação
  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      let valA: string | number = (a as unknown as Record<string, string | number>)[sortField] || ''
      let valB: string | number = (b as unknown as Record<string, string | number>)[sortField] || ''

      if (sortField === 'cliente') {
        valA = a.expand?.cliente_id?.name || ''
        valB = b.expand?.cliente_id?.name || ''
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(String(valB))
          : String(valB).localeCompare(valA)
      }
      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
  }, [filteredContracts, sortField, sortOrder])

  // Paginação
  const paginatedContracts = useMemo(() => {
    const start = (page - 1) * perPage
    return sortedContracts.slice(start, start + perPage)
  }, [sortedContracts, page, perPage])

  const totalPages = Math.ceil(sortedContracts.length / perPage) || 1

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Ação Salvar Modal
  async function handleSaveContract(data: Partial<Contract>) {
    if (selectedContract) {
      const updated = await updateContract(selectedContract.id, data, selectedContract)
      setContracts((prev) => prev.map((c) => (c.id === selectedContract.id ? updated : c)))
      toast({ title: 'Contrato atualizado' })
    } else {
      const created = await createContract(data)
      setContracts((prev) => [created, ...prev])
      toast({ title: 'Contrato criado com sucesso!' })
    }
  }

  // Ação Duplicar
  async function handleDuplicateContract(contract: Contract) {
    try {
      const dup = await duplicateContract(contract)
      setContracts((prev) => [dup, ...prev])
      toast({
        title: 'Contrato duplicado',
        description: `Novo contrato ${dup.numero} gerado em rascunho.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao duplicar contrato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Ação Encerrar / Cancelar com verificação de venda vinculada
  async function handleConfirmCloseContract() {
    if (!contractToClose) return
    try {
      const updated = await updateContract(
        contractToClose.id,
        { status: 'encerrado' },
        contractToClose,
      )
      setContracts((prev) => prev.map((c) => (c.id === contractToClose.id ? updated : c)))
      toast({
        title: 'Contrato encerrado',
        description: 'Status atualizado com sucesso.',
      })
      setContractToClose(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao encerrar contrato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Ação Excluir
  async function handleDeleteContract() {
    if (!contractToDelete) return
    setDeleteLoading(true)
    const backup = contractToDelete
    setContracts((prev) => prev.filter((c) => c.id !== backup.id))

    try {
      await deleteContract(backup.id)
      toast({ title: 'Contrato excluído' })
      setContractToDelete(null)
    } catch (err) {
      setContracts((prev) => [backup, ...prev])
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir contrato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Ação Migrar Leads em Lote
  async function handleMigrateLeads(
    leadsToProcess: Lead[],
    params: {
      periodicidade: Contract['periodicidade']
      data_inicio: string
      data_fim: string
    },
  ) {
    try {
      const created = await migrateLeadsToContracts(leadsToProcess, params)
      setContracts((prev) => [...created, ...prev])
      setConvertedLeads((prev) => prev.filter((l) => !leadsToProcess.some((p) => p.id === l.id)))
      toast({
        title: `${created.length} contrato(s) gerado(s)`,
        description: 'Os contratos foram criados a partir dos leads convertidos.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao migrar leads',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Exportação CSV
  function handleExportCsv() {
    const headers = [
      'Número',
      'Cliente',
      'Produto',
      'Início',
      'Fim',
      'Valor Total',
      'Status',
      'Venda Vinculada',
      'Comissão',
    ]
    const rows = sortedContracts.map((c) => [
      c.numero,
      c.expand?.cliente_id?.name || '',
      c.expand?.produto_id?.nome || 'Personalizado',
      c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '',
      c.data_fim ? new Date(c.data_fim).toLocaleDateString('pt-BR') : '',
      c.valor_total ? `R$ ${c.valor_total}` : 'R$ 0',
      c.status,
      c.expand?.venda_id?.numero || (c.venda_id ? 'Sim' : 'Não'),
      c.comissao_valor ? `R$ ${c.comissao_valor}` : 'R$ 0',
    ])
    exportToCsv('contratos-vendas-pro', headers, rows)
  }

  // Exportação PDF
  function handleExportPdf() {
    const headers = [
      'Número',
      'Cliente',
      'Produto',
      'Vigência',
      'Valor Total',
      'Status',
      'Comissão',
    ]
    const rows = sortedContracts.map((c) => [
      c.numero,
      c.expand?.cliente_id?.name || '',
      c.expand?.produto_id?.nome || 'Personalizado',
      `${new Date(c.data_inicio).toLocaleDateString('pt-BR')} - ${new Date(c.data_fim).toLocaleDateString('pt-BR')}`,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_total),
      c.status,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        c.comissao_valor || 0,
      ),
    ])
    exportToPrintPdf('Relatório de Contratos', headers, rows)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#f8fafc] p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold text-[#0f172a]">Contratos</h1>
            <span className="rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-[#475569]">
              {sortedContracts.length}
            </span>
          </div>
          <p className="text-[12px] text-[#64748b]">
            Gestão de vigências, contratos recorrentes e comissionamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Migrar Leads com Contador */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMigrateModalOpen(true)}
            className="h-8 border-[#e2e8f0] text-[12px] font-medium text-[#1e293b] hover:bg-[#f1f5f9]"
          >
            <Sparkles className="mr-1.5 size-3.5 text-amber-600" />
            Migrar Leads
            {convertedLeads.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-800">
                {convertedLeads.length}
              </span>
            )}
          </Button>

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
            onClick={() => {
              setSelectedContract(null)
              setModalOpen(true)
            }}
            className="h-8 bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-700 shadow-xs"
          >
            <Plus className="mr-1.5 size-3.5" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Barra de KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total de Contratos"
          value={kpis.total}
          icon={<FileText className="size-4" />}
        />
        <KpiCard label="Contratos Ativos" value={kpis.ativos} badge="Vigentes" />
        <KpiCard
          label="Com Venda Vinculada"
          value={`${kpis.comVenda} (${kpis.percentComVenda}%)`}
          icon={<FileCheck className="size-4 text-indigo-600" />}
        />
        <KpiCard
          label="Valor Total"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(kpis.valorTotal)}
        />
        <KpiCard
          label="Comissões Totais"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(kpis.comissaoTotal)}
          badge="Previsto"
        />
      </div>

      {/* Barra de Busca e Filtros Combináveis */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white p-2 text-[12px]">
        {/* Busca textual */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 size-3.5 text-[#94a3b8]" />
          <Input
            placeholder="Buscar por número, cliente ou produto..."
            value={search}
            onChange={(e) => updateParam('q', e.target.value)}
            className="h-7 pl-8 text-[11px]"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[#64748b] pl-1 pr-1">
          <Filter className="size-3.5" />
        </div>

        <Select value={statusFilter} onValueChange={(v) => updateParam('status', v)}>
          <SelectTrigger className="h-7 w-[120px] text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={(v) => updateParam('cliente', v)}>
          <SelectTrigger className="h-7 w-[150px] text-[11px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos clientes</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={(v) => updateParam('produto', v)}>
          <SelectTrigger className="h-7 w-[150px] text-[11px]">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={hasSaleFilter} onValueChange={(v) => updateParam('venda', v)}>
          <SelectTrigger className="h-7 w-[130px] text-[11px]">
            <SelectValue placeholder="Venda vinculada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas vendas</SelectItem>
            <SelectItem value="sim">Com venda</SelectItem>
            <SelectItem value="nao">Sem venda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Contratos */}
      <div className="mt-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-white border border-[#e2e8f0]"
              />
            ))}
          </div>
        ) : sortedContracts.length === 0 ? (
          <EmptyState
            title="Nenhum contrato encontrado"
            description="Cadastre um novo contrato ou migre os leads convertidos pendentes."
            actionLabel="Novo Contrato"
            onAction={() => {
              setSelectedContract(null)
              setModalOpen(true)
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => toggleSort('numero')}
                    className="cursor-pointer px-3 py-2.5 transition hover:text-[#0f172a]"
                  >
                    <div className="flex items-center gap-1">
                      Número <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('cliente')}
                    className="cursor-pointer px-3 py-2.5 transition hover:text-[#0f172a]"
                  >
                    <div className="flex items-center gap-1">
                      Cliente <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5">Vigência</th>
                  <th
                    onClick={() => toggleSort('valor_total')}
                    className="cursor-pointer px-3 py-2.5 text-right transition hover:text-[#0f172a]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valor Total <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Venda Vinculada</th>
                  <th className="px-3 py-2.5 text-right">Comissão</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id} className="h-11 transition hover:bg-[#f8fafc]">
                    <td className="px-3 py-2 font-mono font-medium text-[#0f172a]">
                      {contract.numero}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[#0f172a]">
                        {contract.expand?.cliente_id?.name || 'Cliente removido'}
                      </p>
                      {contract.expand?.cliente_id?.company && (
                        <p className="text-[11px] text-[#64748b]">
                          {contract.expand.cliente_id.company}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#475569]">
                      {contract.expand?.produto_id?.nome || 'Personalizado'}
                    </td>
                    <td className="px-3 py-2 text-[#64748b]">
                      {new Date(contract.data_inicio).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(contract.data_fim).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-[#0f172a]">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(contract.valor_total)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-3 py-2">
                      {contract.expand?.venda_id ? (
                        <span className="font-mono text-[11px] font-medium text-indigo-700">
                          {contract.expand.venda_id.numero}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8]">Sem venda</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#0f172a]">
                      {contract.comissao_valor
                        ? new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(contract.comissao_valor)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-[#64748b]">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-[12px]">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContract(contract)
                              setModalOpen(true)
                            }}
                          >
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateContract(contract)}>
                            Duplicar
                          </DropdownMenuItem>
                          {contract.anexo_url && (
                            <DropdownMenuItem asChild>
                              <a
                                href={contract.anexo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5"
                              >
                                Ver Anexo <ExternalLink className="size-3" />
                              </a>
                            </DropdownMenuItem>
                          )}
                          {contract.status === 'ativo' && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (contract.venda_id) {
                                  setContractToClose(contract)
                                } else {
                                  updateContract(
                                    contract.id,
                                    { status: 'encerrado' },
                                    contract,
                                  ).then((u) => {
                                    setContracts((prev) =>
                                      prev.map((c) => (c.id === contract.id ? u : c)),
                                    )
                                    toast({ title: 'Contrato encerrado' })
                                  })
                                }
                              }}
                            >
                              Encerrar Contrato
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setContractToDelete(contract)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-2 text-[12px] text-[#64748b]">
              <span>
                Página {page} de {totalPages} ({sortedContracts.length} contratos)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 text-[11px]"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-[11px]"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Contrato em Etapas */}
      <ContractModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contract={selectedContract}
        contacts={contacts}
        products={products}
        sales={sales}
        onSave={handleSaveContract}
      />

      {/* Modal Migrar Leads Convertidos */}
      <MigrateLeadsModal
        open={migrateModalOpen}
        onOpenChange={setMigrateModalOpen}
        convertedLeads={convertedLeads}
        onMigrate={handleMigrateLeads}
      />

      {/* Alerta de Encerramento com Venda Vinculada */}
      <ConfirmDialog
        open={Boolean(contractToClose)}
        onOpenChange={(v) => !v && setContractToClose(null)}
        title="Impacto no comissionamento de vendas!"
        description={`O contrato ${contractToClose?.numero} possui uma venda vinculada ativa. O encerramento do contrato impactará o cálculo das comissões pendentes desta venda. Deseja realmente prosseguir?`}
        confirmLabel="Confirmar Encerramento"
        destructive
        onConfirm={handleConfirmCloseContract}
      />

      {/* Diálogo de Confirmação para Excluir */}
      <ConfirmDialog
        open={Boolean(contractToDelete)}
        onOpenChange={(v) => !v && setContractToDelete(null)}
        title="Excluir contrato?"
        description={`Tem certeza que deseja excluir permanentemente o contrato "${contractToDelete?.numero}"?`}
        confirmLabel="Excluir Contrato"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteContract}
      />
    </div>
  )
}
