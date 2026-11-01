import { useState } from 'react'
import { CalendarIcon, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskEntidadeTipo, TaskItem, TaskPrioridade, TaskTipo } from '@/types/vendasPro'
import type { UserRecord } from '@/types/crm'

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: TaskItem | null
  users: UserRecord[]
  onSave: (data: Partial<TaskItem>) => Promise<void>
}

export function TaskModal({ open, onOpenChange, task, users, onSave }: TaskModalProps) {
  const [titulo, setTitulo] = useState(task?.titulo || '')
  const [descricao, setDescricao] = useState(task?.descricao || '')
  const [tipo, setTipo] = useState<TaskTipo>(task?.tipo || 'follow_up')
  const [prioridade, setPrioridade] = useState<TaskPrioridade>(task?.prioridade || 'media')
  const [vencimento, setVencimento] = useState(task?.vencimento ? task.vencimento.slice(0, 10) : '')
  const [responsavelId, setResponsavelId] = useState(task?.responsavel_id || '')
  const [entidadeTipo, setEntidadeTipo] = useState<TaskEntidadeTipo | 'nenhum'>(
    task?.entidade_tipo || 'nenhum',
  )
  const [entidadeId, setEntidadeId] = useState(task?.entidade_id || '')
  const [loading, setLoading] = useState(false)

  // Resetar quando abrir para edição ou nova
  function handleOpenChange(val: boolean) {
    if (val && task) {
      setTitulo(task.titulo || '')
      setDescricao(task.descricao || '')
      setTipo(task.tipo || 'follow_up')
      setPrioridade(task.prioridade || 'media')
      setVencimento(task.vencimento ? task.vencimento.slice(0, 10) : '')
      setResponsavelId(task.responsavel_id || '')
      setEntidadeTipo(task.entidade_tipo || 'nenhum')
      setEntidadeId(task.entidade_id || '')
    } else if (val) {
      setTitulo('')
      setDescricao('')
      setTipo('follow_up')
      setPrioridade('media')
      setVencimento('')
      setResponsavelId('')
      setEntidadeTipo('nenhum')
      setEntidadeId('')
    }
    onOpenChange(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return

    setLoading(true)
    try {
      await onSave({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        prioridade,
        vencimento: vencimento ? new Date(vencimento).toISOString() : undefined,
        responsavel_id: responsavelId || undefined,
        entidade_tipo: entidadeTipo !== 'nenhum' ? entidadeTipo : undefined,
        entidade_id: entidadeTipo !== 'nenhum' && entidadeId.trim() ? entidadeId.trim() : undefined,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[540px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#1e293b]">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Atribua prazos, prioridade e vincule a entidades do CRM Vendas PRO.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">Título da Tarefa *</label>
            <Input
              required
              placeholder="Ex: Ligar para confirmar envio de contrato..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-8 text-[12px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Tipo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskTipo)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Prioridade</label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TaskPrioridade)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Vencimento</label>
              <div className="relative">
                <Input
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Responsável</label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Vincular a</label>
              <Select
                value={entidadeTipo}
                onValueChange={(v) => setEntidadeTipo(v as TaskEntidadeTipo | 'nenhum')}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="contract">Contrato</SelectItem>
                  <SelectItem value="deal">Negócio (CRM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entidadeTipo !== 'nenhum' && (
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#475569]">ID ou Código</label>
                <Input
                  placeholder="ID da entidade..."
                  value={entidadeId}
                  onChange={(e) => setEntidadeId(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">Descrição / Notas</label>
            <Textarea
              placeholder="Detalhes opcionais..."
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="resize-none text-[12px]"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="h-8 border-[#e2e8f0] text-[12px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !titulo.trim()}
              className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
            >
              {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
              {task ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
