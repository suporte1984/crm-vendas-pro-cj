import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Kanban,
  List,
  MoreHorizontal,
  Plus,
  TrendingUp,
  User,
  Users,
  XCircle,
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
import { LeadModal } from '@/components/vendas-pro/LeadModal'
import { LostLeadModal } from '@/components/vendas-pro/LostLeadModal'
import { useToast } from '@/hooks/use-toast'
import { useCrm } from '@/contexts/CrmContext'
import {
  convertLeadToContactAndDeal,
  createLead,
  deleteLead,
  listLeads,
  listProducts,
  markLeadAsLost,
  updateLead,
} from '@/services/leads'
import type { Lead, LeadOrigem, LeadStatus, Product } from '@/types/vendasPro'
import { exportToCsv, exportToPrintPdf } from '@/lib/vendasProExport'
import { cn } from '@/lib/utils'

const KANBAN_COLUMNS: { id: LeadStatus; label: string; dot: string; color: string }[] = [
  { id: 'novo', label: 'Novo', dot: 'bg-blue-500', color: 'border-blue-200' },
  { id: 'em_negociacao', label: 'Em Negociação', dot: 'bg-amber-500', color: 'border-amber-200' },
  { id: 'convertido', label: 'Convertido', dot: 'bg-emerald-500', color: 'border-emerald-200' },
  { id: 'perdido', label: 'Perdido', dot: 'bg-rose-500', color: 'border-rose-200' },
]

export function LeadsPage() {
  const { users } = useCrm()
  const { toast } = useToast()

  const [leads, setLeads] = useState<Lead[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban')

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterOrigem, setFilterOrigem] = useState<string>('todos')
  const [filterResponsavel, setFilterResponsavel] = useState<string>('todos')
  const [filterProduto, setFilterProduto] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [leadToLose, setLeadToLose] = useState<Lead | null>(null)

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Drag and drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [leadsData, productsData] = await Promise.all([listLeads(), listProducts()])
      setLeads(leadsData)
      setProducts(productsData)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de leads',
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
    const total = leads.length
    const novos = leads.filter((l) => l.status === 'novo').length
    const negociacao = leads.filter((l) => l.status === 'em_negociacao').length
    const convertidos = leads.filter((l) => l.status === 'convertido').length
    const taxaConversao = total > 0 ? Math.round((convertidos / total) * 100) : 0

    return { total, novos, negociacao, convertidos, taxaConversao }
  }, [leads])

  // Filtros
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus !== 'todos' && l.status !== filterStatus) return false
      if (filterOrigem !== 'todos' && l.origem !== filterOrigem) return false
      if (filterResponsavel !== 'todos' && l.responsavel_id !== filterResponsavel) return false
      if (filterProduto !== 'todos' && l.produto_interesse_id !== filterProduto) return false
      return true
    })
  }, [leads, filterStatus, filterOrigem, filterResponsavel, filterProduto])

  // Drag and Drop
  async function handleDrop(targetStatus: LeadStatus) {
    if (!draggedLeadId) return
    const lead = leads.find((l) => l.id === draggedLeadId)
    if (!lead || lead.status === targetStatus) {
      setDraggedLeadId(null)
      return
    }

    if (targetStatus === 'perdido') {
      setLeadToLose(lead)
      setLostModalOpen(true)
      setDraggedLeadId(null)
      return
    }

    if (targetStatus === 'convertido') {
      handleConvertLead(lead)
      setDraggedLeadId(null)
      return
    }

    // Mudança para 'novo' ou 'em_negociacao'
    const prevStatus = lead.status
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: targetStatus } : l)))
    setDraggedLeadId(null)

    try {
      await updateLead(lead.id, { status: targetStatus }, lead)
      toast({
        title: 'Status atualizado',
        description: `Lead movido para ${targetStatus.replace('_', ' ')}.`,
      })
    } catch (err) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: prevStatus } : l)))
      toast({
        variant: 'destructive',
        title: 'Erro ao mover lead',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Ação Converter
  async function handleConvertLead(lead: Lead) {
    try {
      const res = await convertLeadToContactAndDeal(lead)
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.lead : l)))
      toast({
        title: 'Lead convertido com sucesso!',
        description: 'Contato associado e Negócio criado no pipeline do CRM.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao converter lead',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Ação Perder
  async function handleConfirmLost(motivo: string) {
    if (!leadToLose) return
    try {
      const updated = await markLeadAsLost(leadToLose, motivo)
      setLeads((prev) => prev.map((l) => (l.id === leadToLose.id ? updated : l)))
      toast({
        title: 'Lead marcado como perdido',
        description: 'Motivo registrado no histórico de auditoria.',
      })
      setLeadToLose(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar perda',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  // Ação Salvar Modal (Criar / Editar)
  async function handleSaveLead(data: Partial<Lead>) {
    if (selectedLead) {
      const updated = await updateLead(selectedLead.id, data, selectedLead)
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updated : l)))
      toast({ title: 'Lead atualizado' })
    } else {
      const created = await createLead(data)
      setLeads((prev) => [created, ...prev])
      toast({ title: 'Lead criado' })
    }
  }

  // Ação Excluir
  async function handleDeleteLead() {
    if (!leadToDelete) return
    setDeleteLoading(true)
    const backup = leadToDelete
    setLeads((prev) => prev.filter((l) => l.id !== backup.id))

    try {
      await deleteLead(backup.id)
      toast({ title: 'Lead excluído' })
      setLeadToDelete(null)
    } catch (err) {
      setLeads((prev) => [backup, ...prev])
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir lead',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Exportação CSV
  function handleExportCsv() {
    const headers = [
      'Nome',
      'Empresa',
      'E-mail',
      'Telefone',
      'Origem',
      'Status',
      'Valor Estimado',
      'Responsável',
      'Próxima Ação',
    ]
    const rows = filteredLeads.map((l) => [
      l.nome,
      l.empresa || '',
      l.email || '',
      l.telefone || '',
      l.origem || '',
      l.status,
      l.valor_estimado ? `R$ ${l.valor_estimado}` : 'R$ 0',
      l.expand?.responsavel_id?.name || '',
      l.proxima_acao_em ? new Date(l.proxima_acao_em).toLocaleDateString('pt-BR') : '',
    ])
    exportToCsv('leads-vendas-pro', headers, rows)
  }

  // Exportação PDF
  function handleExportPdf() {
    const headers = ['Nome', 'Empresa', 'E-mail', 'Telefone', 'Status', 'Valor', 'Responsável']
    const rows = filteredLeads.map((l) => [
      l.nome,
      l.empresa || '',
      l.email || '',
      l.telefone || '',
      l.status,
      l.valor_estimado
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            l.valor_estimado,
          )
        : '—',
      l.expand?.responsavel_id?.name || '',
    ])
    exportToPrintPdf('Relatório de Leads', headers, rows)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#f8fafc] p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold text-[#0f172a]">Leads & Funil</h1>
            <span className="rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-[#475569]">
              {filteredLeads.length}
            </span>
          </div>
          <p className="text-[12px] text-[#64748b]">
            Qualifique leads no funil comercial e converta em negócios e contatos no CRM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternância Kanban / Lista */}
          <div className="flex rounded-md border border-[#e2e8f0] bg-white p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition',
                viewMode === 'kanban'
                  ? 'bg-[#e2e8f0] text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]',
              )}
            >
              <Kanban className="size-3.5" />
              Kanban
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
            onClick={() => {
              setSelectedLead(null)
              setModalOpen(true)
            }}
            className="h-8 bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-700 shadow-xs"
          >
            <Plus className="mr-1.5 size-3.5" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Barra de KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total de Leads" value={kpis.total} icon={<Users className="size-4" />} />
        <KpiCard label="Novos" value={kpis.novos} badge="Aberto" />
        <KpiCard label="Em Negociação" value={kpis.negociacao} badge="Ativos" />
        <KpiCard
          label="Convertidos"
          value={kpis.convertidos}
          icon={<CheckCircle2 className="size-4 text-emerald-600" />}
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${kpis.taxaConversao}%`}
          icon={<TrendingUp className="size-4 text-amber-600" />}
        />
      </div>

      {/* Barra de Filtros */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white p-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-[#64748b] pl-1 pr-2">
          <Filter className="size-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros:</span>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 w-[130px] text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="em_negociacao">Em Negociação</SelectItem>
            <SelectItem value="convertido">Convertido</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOrigem} onValueChange={setFilterOrigem}>
          <SelectTrigger className="h-7 w-[120px] text-[11px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="site">Site</SelectItem>
            <SelectItem value="indicacao">Indicação</SelectItem>
            <SelectItem value="anuncio">Anúncio</SelectItem>
            <SelectItem value="evento">Evento</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="h-7 w-[140px] text-[11px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos responsáveis</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProduto} onValueChange={setFilterProduto}>
          <SelectTrigger className="h-7 w-[150px] text-[11px]">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo Principal */}
      <div className="mt-4 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-lg bg-white border border-[#e2e8f0]"
              />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Cadastre um novo lead para alimentar o funil comercial."
            actionLabel="Novo Lead"
            onAction={() => {
              setSelectedLead(null)
              setModalOpen(true)
            }}
          />
        ) : viewMode === 'kanban' ? (
          /* Visão Kanban com Drag-and-Drop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
            {KANBAN_COLUMNS.map((column) => {
              const columnLeads = filteredLeads.filter((l) => l.status === column.id)

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(column.id)}
                  className="flex flex-col rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5 min-h-[420px]"
                >
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2 rounded-full', column.dot)} />
                      <span className="text-[12px] font-semibold text-[#1e293b]">
                        {column.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-[#64748b]">
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-2 flex-1">
                    {columnLeads.map((lead) => {
                      const now = new Date().getTime()
                      const nextActionTime = lead.proxima_acao_em
                        ? new Date(lead.proxima_acao_em).getTime()
                        : null
                      const isNextActionOverdue =
                        nextActionTime && nextActionTime < now && lead.status !== 'convertido'

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => setDraggedLeadId(lead.id)}
                          className={cn(
                            'group cursor-grab active:cursor-grabbing rounded-lg border border-[#e2e8f0] bg-white p-3 shadow-2xs transition hover:border-[#cbd5e1] hover:shadow-xs',
                            draggedLeadId === lead.id && 'opacity-50 ring-2 ring-amber-500',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[13px] font-semibold text-[#0f172a] leading-tight">
                                {lead.nome}
                              </p>
                              {lead.empresa && (
                                <p className="text-[11px] text-[#64748b]">{lead.empresa}</p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-[#94a3b8] hover:text-[#0f172a]"
                                >
                                  <MoreHorizontal className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-[12px]">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLead(lead)
                                    setModalOpen(true)
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                                {lead.status !== 'convertido' && (
                                  <DropdownMenuItem onClick={() => handleConvertLead(lead)}>
                                    Converter em Negócio
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== 'perdido' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setLeadToLose(lead)
                                      setLostModalOpen(true)
                                    }}
                                  >
                                    Marcar como Perdido
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setLeadToDelete(lead)}
                                  className="text-rose-600 focus:text-rose-600"
                                >
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {lead.expand?.produto_interesse_id && (
                            <p className="mt-1.5 text-[11px] font-medium text-amber-700 truncate">
                              {lead.expand.produto_interesse_id.nome}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center justify-between border-t border-[#f1f5f9] pt-2 text-[11px]">
                            <span className="font-mono font-semibold text-[#0f172a]">
                              {lead.valor_estimado
                                ? new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    maximumFractionDigits: 0,
                                  }).format(lead.valor_estimado)
                                : '—'}
                            </span>

                            {lead.expand?.responsavel_id ? (
                              <span
                                title={lead.expand.responsavel_id.name || ''}
                                className="flex size-5 items-center justify-center rounded-full bg-[#e2e8f0] text-[9px] font-bold text-[#475569]"
                              >
                                {lead.expand.responsavel_id.name
                                  ? lead.expand.responsavel_id.name[0].toUpperCase()
                                  : 'U'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#94a3b8]">Sem resp.</span>
                            )}
                          </div>

                          {lead.proxima_acao_em && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                              <Clock className="size-3 text-[#94a3b8]" />
                              <span
                                className={cn(
                                  'font-medium',
                                  isNextActionOverdue ? 'text-rose-600' : 'text-[#64748b]',
                                )}
                              >
                                Próx: {new Date(lead.proxima_acao_em).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}

                          {lead.motivo_perda && (
                            <p className="mt-1 rounded bg-rose-50 p-1 text-[10px] text-rose-700">
                              {lead.motivo_perda}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Visão Lista Alternativa */
          <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Nome / Empresa</th>
                  <th className="px-3 py-2.5">Contato</th>
                  <th className="px-3 py-2.5">Origem</th>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5 text-right">Valor Estimado</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-[#f8fafc]">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-[#0f172a]">{lead.nome}</p>
                      {lead.empresa && <p className="text-[11px] text-[#64748b]">{lead.empresa}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-[#475569]">
                      <p>{lead.email || '—'}</p>
                      <p className="text-[11px] text-[#64748b]">{lead.telefone || ''}</p>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-[#475569]">{lead.origem || '—'}</td>
                    <td className="px-3 py-2.5 text-[#475569]">
                      {lead.expand?.produto_interesse_id?.nome || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-[#0f172a]">
                      {lead.valor_estimado
                        ? new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(lead.valor_estimado)
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-2.5 text-[#475569]">
                      {lead.expand?.responsavel_id?.name || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-[#64748b]">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-[12px]">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLead(lead)
                              setModalOpen(true)
                            }}
                          >
                            Editar
                          </DropdownMenuItem>
                          {lead.status !== 'convertido' && (
                            <DropdownMenuItem onClick={() => handleConvertLead(lead)}>
                              Converter em Negócio
                            </DropdownMenuItem>
                          )}
                          {lead.status !== 'perdido' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setLeadToLose(lead)
                                setLostModalOpen(true)
                              }}
                            >
                              Marcar como Perdido
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setLeadToDelete(lead)}
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
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Lead */}
      <LeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        lead={selectedLead}
        products={products}
        users={users}
        onSave={handleSaveLead}
      />

      {/* Modal Perder Lead */}
      <LostLeadModal
        open={lostModalOpen}
        onOpenChange={setLostModalOpen}
        lead={leadToLose}
        onConfirm={handleConfirmLost}
      />

      {/* Diálogo de Confirmação para Excluir */}
      <ConfirmDialog
        open={Boolean(leadToDelete)}
        onOpenChange={(v) => !v && setLeadToDelete(null)}
        title="Excluir lead?"
        description={`Tem certeza que deseja excluir permanentemente o lead "${leadToDelete?.nome}"?`}
        confirmLabel="Excluir Lead"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteLead}
      />
    </div>
  )
}
