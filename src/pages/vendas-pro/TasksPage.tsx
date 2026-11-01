import { useEffect, useMemo, useState } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  List,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { StatusBadge } from '@/components/vendas-pro/StatusBadge'
import { EmptyState } from '@/components/vendas-pro/EmptyState'
import { ConfirmDialog } from '@/components/vendas-pro/ConfirmDialog'
import { TaskModal } from '@/components/vendas-pro/TaskModal'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useCrm } from '@/contexts/CrmContext'
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTaskCompletion,
  updateTask,
} from '@/services/tasks'
import type { TaskItem, TaskPrioridade, TaskStatus, TaskTipo } from '@/types/vendasPro'
import { cn } from '@/lib/utils'

export function TasksPage() {
  const { user } = useAuth()
  const { users } = useCrm()
  const { toast } = useToast()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista')

  // Criação rápida inline
  const [quickTitle, setQuickTitle] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)

  // Filtros
  const [filterResponsavel, setFilterResponsavel] = useState<string>('todos')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterPrioridade, setFilterPrioridade] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadTasks() {
    setLoading(true)
    try {
      const data = await listTasks()
      setTasks(data)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar tarefas',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // Criação rápida inline
  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = quickTitle.trim()
    if (!trimmed || quickLoading) return

    setQuickLoading(true)
    try {
      const newTask = await createTask({
        titulo: trimmed,
        tipo: 'outro',
        prioridade: 'media',
        responsavel_id: user?.id,
        status: 'pendente',
      })
      setTasks((prev) => [newTask, ...prev])
      setQuickTitle('')
      toast({
        title: 'Tarefa criada',
        description: 'Tarefa adicionada com sucesso.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar tarefa',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setQuickLoading(false)
    }
  }

  // Checkbox de conclusão com atualização otimista
  async function handleToggleComplete(task: TaskItem) {
    const isCompleted = task.status === 'concluida'
    const newStatus: TaskStatus = isCompleted ? 'pendente' : 'concluida'
    const nowIso = new Date().toISOString()

    // Otimista
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: newStatus,
              concluida_em: isCompleted ? undefined : nowIso,
            }
          : t,
      ),
    )

    try {
      await toggleTaskCompletion(task.id, isCompleted)
      toast({
        title: isCompleted ? 'Tarefa reaberta' : 'Tarefa concluída',
        description: isCompleted ? 'Status alterado para pendente.' : 'Parabéns!',
      })
    } catch (err) {
      // Reverter
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar tarefa',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return
    setDeleteLoading(true)
    const backup = taskToDelete
    setTasks((prev) => prev.filter((t) => t.id !== backup.id))

    try {
      await deleteTask(backup.id)
      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi removida.',
      })
      setTaskToDelete(null)
    } catch (err) {
      setTasks((prev) => [backup, ...prev])
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir tarefa',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSaveModalTask(data: Partial<TaskItem>) {
    if (selectedTask) {
      const updated = await updateTask(selectedTask.id, data)
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updated : t)))
      toast({ title: 'Tarefa atualizada' })
    } else {
      const created = await createTask(data)
      setTasks((prev) => [created, ...prev])
      toast({ title: 'Tarefa criada' })
    }
  }

  // Filtragem
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterResponsavel !== 'todos' && t.responsavel_id !== filterResponsavel) return false
      if (filterTipo !== 'todos' && t.tipo !== filterTipo) return false
      if (filterPrioridade !== 'todos' && t.prioridade !== filterPrioridade) return false
      if (filterStatus !== 'todos') {
        if (filterStatus === 'pendente' && t.status === 'concluida') return false
        if (filterStatus === 'concluida' && t.status !== 'concluida') return false
      }
      return true
    })
  }, [tasks, filterResponsavel, filterTipo, filterPrioridade, filterStatus])

  // Agrupamento por vencimento (Atrasadas, Hoje, Esta semana, Depois, Sem data)
  const groupedTasks = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000
    const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000

    const groups: {
      atrasadas: TaskItem[]
      hoje: TaskItem[]
      estaSemana: TaskItem[]
      depois: TaskItem[]
      semData: TaskItem[]
    } = {
      atrasadas: [],
      hoje: [],
      estaSemana: [],
      depois: [],
      semData: [],
    }

    filteredTasks.forEach((task) => {
      if (task.status === 'concluida') {
        groups.depois.push(task)
        return
      }

      if (!task.vencimento) {
        groups.semData.push(task)
        return
      }

      const dueTime = new Date(task.vencimento).getTime()
      if (dueTime < startOfToday) {
        groups.atrasadas.push(task)
      } else if (dueTime >= startOfToday && dueTime < endOfToday) {
        groups.hoje.push(task)
      } else if (dueTime >= endOfToday && dueTime < endOfWeek) {
        groups.estaSemana.push(task)
      } else {
        groups.depois.push(task)
      }
    })

    return groups
  }, [filteredTasks])

  function getEntityLink(entidadeTipo?: string, entidadeId?: string) {
    if (!entidadeTipo || !entidadeId) return null
    if (entidadeTipo === 'deal') return `/negocios`
    if (entidadeTipo === 'lead') return `/vendas-pro/leads`
    if (entidadeTipo === 'sale') return `/vendas-pro/vendas`
    if (entidadeTipo === 'contract') return `/vendas-pro/contratos`
    return null
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#f8fafc] p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold text-[#0f172a]">Tarefas</h1>
            <span className="rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-[#475569]">
              {filteredTasks.length}
            </span>
          </div>
          <p className="text-[12px] text-[#64748b]">
            Acompanhe follow-ups, reuniões e pendências agrupadas por prazo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternância Lista / Calendário */}
          <div className="flex rounded-md border border-[#e2e8f0] bg-white p-0.5">
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
            <button
              onClick={() => setViewMode('calendario')}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition',
                viewMode === 'calendario'
                  ? 'bg-[#e2e8f0] text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]',
              )}
            >
              <CalendarIcon className="size-3.5" />
              Calendário
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setSelectedTask(null)
              setModalOpen(true)
            }}
            className="h-8 bg-amber-600 px-3 text-[12px] font-medium text-white hover:bg-amber-700 shadow-xs"
          >
            <Plus className="mr-1.5 size-3.5" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Barra de Criação Rápida Inline */}
      <form onSubmit={handleQuickCreate} className="mt-4 flex items-center gap-2">
        <Input
          placeholder="Adicionar tarefa rapidamente e pressionar Enter..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          disabled={quickLoading}
          className="h-9 border-[#e2e8f0] bg-white text-[12px] shadow-xs placeholder:text-[#94a3b8] focus:border-amber-500"
        />
        <Button
          type="submit"
          disabled={quickLoading || !quickTitle.trim()}
          size="sm"
          className="h-9 bg-slate-800 px-3 text-[12px] text-white hover:bg-slate-900"
        >
          Criar
        </Button>
      </form>

      {/* Barra de Filtros */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white p-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-[#64748b] pl-1 pr-2">
          <Filter className="size-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros:</span>
        </div>

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

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-7 w-[120px] text-[11px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
            <SelectItem value="ligacao">Ligação</SelectItem>
            <SelectItem value="reuniao">Reunião</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
          <SelectTrigger className="h-7 w-[130px] text-[11px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas prioridades</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 w-[120px] text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
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
                className="h-14 animate-pulse rounded-lg bg-white border border-[#e2e8f0]"
              />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa encontrada"
            description="Crie uma nova tarefa inline pelo campo acima ou pelo botão Nova Tarefa."
            actionLabel="Criar Tarefa"
            onAction={() => {
              setSelectedTask(null)
              setModalOpen(true)
            }}
          />
        ) : viewMode === 'lista' ? (
          <div className="space-y-6">
            {groupedTasks.atrasadas.length > 0 && (
              <TaskSection
                title="Atrasadas"
                color="text-rose-600"
                badgeBg="bg-rose-100 text-rose-700"
                tasks={groupedTasks.atrasadas}
                onToggle={handleToggleComplete}
                onEdit={(t) => {
                  setSelectedTask(t)
                  setModalOpen(true)
                }}
                onDelete={(t) => setTaskToDelete(t)}
                getEntityLink={getEntityLink}
              />
            )}

            {groupedTasks.hoje.length > 0 && (
              <TaskSection
                title="Hoje"
                color="text-amber-600"
                badgeBg="bg-amber-100 text-amber-700"
                tasks={groupedTasks.hoje}
                onToggle={handleToggleComplete}
                onEdit={(t) => {
                  setSelectedTask(t)
                  setModalOpen(true)
                }}
                onDelete={(t) => setTaskToDelete(t)}
                getEntityLink={getEntityLink}
              />
            )}

            {groupedTasks.estaSemana.length > 0 && (
              <TaskSection
                title="Esta semana"
                color="text-blue-600"
                badgeBg="bg-blue-100 text-blue-700"
                tasks={groupedTasks.estaSemana}
                onToggle={handleToggleComplete}
                onEdit={(t) => {
                  setSelectedTask(t)
                  setModalOpen(true)
                }}
                onDelete={(t) => setTaskToDelete(t)}
                getEntityLink={getEntityLink}
              />
            )}

            {groupedTasks.depois.length > 0 && (
              <TaskSection
                title="Depois / Futuras"
                color="text-slate-600"
                badgeBg="bg-slate-100 text-slate-700"
                tasks={groupedTasks.depois}
                onToggle={handleToggleComplete}
                onEdit={(t) => {
                  setSelectedTask(t)
                  setModalOpen(true)
                }}
                onDelete={(t) => setTaskToDelete(t)}
                getEntityLink={getEntityLink}
              />
            )}

            {groupedTasks.semData.length > 0 && (
              <TaskSection
                title="Sem data de vencimento"
                color="text-slate-500"
                badgeBg="bg-slate-100 text-slate-600"
                tasks={groupedTasks.semData}
                onToggle={handleToggleComplete}
                onEdit={(t) => {
                  setSelectedTask(t)
                  setModalOpen(true)
                }}
                onDelete={(t) => setTaskToDelete(t)}
                getEntityLink={getEntityLink}
              />
            )}
          </div>
        ) : (
          /* Visão Calendário simples */
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
            <h3 className="mb-3 text-[14px] font-semibold text-[#1e293b]">
              Visão Mensal de Prazos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {['Atrasadas', 'Hoje', 'Esta semana', 'Depois'].map((colTitle, idx) => {
                const colTasks =
                  idx === 0
                    ? groupedTasks.atrasadas
                    : idx === 1
                      ? groupedTasks.hoje
                      : idx === 2
                        ? groupedTasks.estaSemana
                        : groupedTasks.depois

                return (
                  <div
                    key={colTitle}
                    className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
                      <span className="text-[12px] font-semibold text-[#334155]">{colTitle}</span>
                      <span className="font-mono text-[11px] text-[#64748b]">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="rounded border border-[#e2e8f0] bg-white p-2 shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={t.status === 'concluida'}
                              onCheckedChange={() => handleToggleComplete(t)}
                            />
                            <span
                              className={cn(
                                'text-[12px] font-medium truncate flex-1',
                                t.status === 'concluida'
                                  ? 'line-through text-[#94a3b8]'
                                  : 'text-[#1e293b]',
                              )}
                            >
                              {t.titulo}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-[#64748b]">
                            <StatusBadge status={t.prioridade} />
                            <span>
                              {t.vencimento
                                ? new Date(t.vencimento).toLocaleDateString('pt-BR')
                                : 'Sem data'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Tarefa */}
      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={selectedTask}
        users={users}
        onSave={handleSaveModalTask}
      />

      {/* Diálogo de Confirmação para Excluir */}
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        onOpenChange={(v) => !v && setTaskToDelete(null)}
        title="Excluir tarefa?"
        description={`Tem certeza que deseja excluir permanentemente a tarefa "${taskToDelete?.titulo}"?`}
        confirmLabel="Excluir Tarefa"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteTask}
      />
    </div>
  )
}

function TaskSection({
  title,
  color,
  badgeBg,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  getEntityLink,
}: {
  title: string
  color: string
  badgeBg: string
  tasks: TaskItem[]
  onToggle: (t: TaskItem) => void
  onEdit: (t: TaskItem) => void
  onDelete: (t: TaskItem) => void
  getEntityLink: (tipo?: string, id?: string) => string | null
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className={cn('text-[12px] font-bold uppercase tracking-wider', color)}>{title}</h2>
        <span className={cn('rounded px-1.5 py-0.2 font-mono text-[10px] font-medium', badgeBg)}>
          {tasks.length}
        </span>
      </div>

      <div className="divide-y divide-[#f1f5f9] rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
        {tasks.map((task) => {
          const isDone = task.status === 'concluida'
          const link = getEntityLink(task.entidade_tipo, task.entidade_id)

          return (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-[#f8fafc]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => onToggle(task)}
                  className="size-4 rounded border-[#cbd5e1] data-[state=checked]:bg-emerald-600"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[13px] font-medium transition',
                      isDone ? 'line-through text-[#94a3b8]' : 'text-[#1e293b]',
                    )}
                  >
                    {task.titulo}
                  </p>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#64748b]">
                    <span className="capitalize">{task.tipo.replace('_', ' ')}</span>
                    <span>•</span>
                    <StatusBadge status={task.prioridade} />

                    {task.vencimento && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                        </span>
                      </>
                    )}

                    {task.expand?.responsavel_id && (
                      <>
                        <span>•</span>
                        <span className="text-[#475569]">
                          {task.expand.responsavel_id.name || task.expand.responsavel_id.email}
                        </span>
                      </>
                    )}

                    {link && (
                      <>
                        <span>•</span>
                        <Link
                          to={link}
                          className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline"
                        >
                          <span className="capitalize">{task.entidade_tipo}</span>
                          <ExternalLink className="size-2.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 text-[#64748b]">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 text-[12px]">
                    <DropdownMenuItem onClick={() => onEdit(task)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(task)}
                      className="text-rose-600 focus:text-rose-600"
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
