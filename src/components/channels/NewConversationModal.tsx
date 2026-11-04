import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createManualConversation } from '@/services/channels'
import type { ChannelConnection, ChannelConversation } from '@/types/channels'

export function NewConversationModal({
  open,
  onClose,
  connections,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  connections: ChannelConnection[]
  onCreated: (conv: ChannelConversation) => void
}) {
  const { toast } = useToast()
  const [connectionId, setConnectionId] = useState('')
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (connections.length > 0 && !connectionId) {
      setConnectionId(connections[0].id)
    }
  }, [connections, connectionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!connectionId || !nome.trim() || !identificador.trim() || !mensagem.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha canal, nome, telefone/usuário e a mensagem inicial.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const conv = await createManualConversation({
        connectionId,
        clienteNome: nome.trim(),
        clienteIdentificador: identificador.trim(),
        mensagemInicial: mensagem.trim(),
      })

      toast({
        title: 'Conversa iniciada',
        description: `Conversa com ${nome} criada com sucesso.`,
      })

      onCreated(conv)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar conversa.'
      toast({
        title: 'Erro ao criar conversa',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-[16px] font-semibold text-foreground">
            Nova Conversa / Testar Entrada
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0">
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Canal de Atendimento</label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.tipo === 'instagram' ? 'Instagram' : 'WhatsApp'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Nome do Cliente</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Carlos Andrade"
              required
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Telefone / Identificador (com DDD)
            </label>
            <Input
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Ex: +55 (11) 98765-4321"
              required
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Mensagem Inicial Recebida
            </label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: Olá, gostaria de saber mais informações sobre os planos..."
              rows={3}
              required
              className="text-[13px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-primary text-primary-foreground gap-1.5"
            >
              <Plus className="size-4" />
              {loading ? 'Criando...' : 'Iniciar Conversa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
