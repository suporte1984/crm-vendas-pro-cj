import { useState, useEffect, useRef } from 'react'
import {
  Send,
  User,
  Phone,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Sparkles,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  listChannelMessages,
  sendChannelMessage,
  markConversationAsRead,
  updateConversationStatus,
} from '@/services/channels'
import type { ChannelConversation, ChannelMessage } from '@/types/channels'

export function ChatArea({
  conversation,
  onUpdated,
  onOpenMetaModal,
}: {
  conversation: ChannelConversation
  onUpdated: () => void
  onOpenMetaModal: () => void
}) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [testModeWarning, setTestModeWarning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    if (conversation.nao_lidas > 0) {
      markConversationAsRead(conversation.id)
        .then(() => onUpdated())
        .catch(() => {})
    }
  }, [conversation.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadMessages() {
    setLoading(true)
    try {
      const data = await listChannelMessages(conversation.id)
      setMessages(data)
    } catch {
      toast({
        title: 'Erro ao carregar mensagens',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    try {
      const res = await sendChannelMessage(conversation.id, content)
      setText('')

      if (res.is_simulated) {
        setTestModeWarning(true)
        toast({
          title: 'Mensagem registrada (Modo de Teste)',
          description:
            'Credenciais oficiais da Meta não configuradas nos Segredos. Mensagem gravada no CRM para conferência.',
        })
      } else {
        toast({
          title: 'Mensagem enviada',
          description: 'Despachada com sucesso pela API oficial da Meta.',
        })
      }

      await loadMessages()
      onUpdated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  async function handleToggleStatus() {
    const next = conversation.status === 'fechada' ? 'aberta' : 'fechada'
    try {
      await updateConversationStatus(conversation.id, next)
      toast({
        title: `Conversa ${next === 'fechada' ? 'fechada' : 'reaberta'}`,
      })
      onUpdated()
    } catch {
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      })
    }
  }

  const isWa =
    conversation.expand?.connection?.tipo === 'whatsapp' ||
    conversation.expand?.connection?.tipo === 'whatsapp_cloud'

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header da Conversa */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {conversation.cliente_nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[15px] text-foreground truncate">
                {conversation.cliente_nome}
              </h2>
              <Badge
                variant={conversation.status === 'aberta' ? 'default' : 'outline'}
                className="text-[10px] uppercase font-mono px-1.5 py-0"
              >
                {conversation.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Phone className="size-3" />
                {conversation.cliente_identificador}
              </span>
              <span>•</span>
              <span className="truncate">
                {conversation.expand?.connection?.name || (isWa ? 'WhatsApp' : 'Instagram')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleStatus}
            className="text-[12px] h-8"
          >
            {conversation.status === 'fechada' ? 'Reabrir Conversa' : 'Finalizar Atendimento'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenMetaModal}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            title="Configurações da Meta API"
          >
            <KeyRound className="size-4" />
          </Button>
        </div>
      </div>

      {/* Alerta de Modo de Teste quando aplicável */}
      <div className="border-b border-border bg-amber-500/10 px-4 py-2 text-[12px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Modo de Teste Ativo:</strong> As respostas são salvas no CRM. Para envio real
            via WhatsApp Cloud API ou Instagram Direct, configure as chaves da Meta.
          </span>
        </div>
        <button
          onClick={onOpenMetaModal}
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 text-[11px] shrink-0"
        >
          Ver chaves <ExternalLink className="size-3" />
        </button>
      </div>

      {/* Área de Mensagens com scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {loading ? (
          <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-muted-foreground p-8">
            <div>
              <Sparkles className="size-8 mx-auto text-primary/60 mb-2" />
              <p className="font-semibold text-foreground text-[14px]">Início da Conversa</p>
              <p className="text-[12px] mt-1 max-w-sm">
                Envie uma mensagem abaixo para iniciar o atendimento a este cliente.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOut = msg.direcao === 'saida'
            const time = new Date(msg.created).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div key={msg.id} className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] leading-relaxed break-words ${
                    isOut
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-card border border-border text-foreground rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.texto}</p>

                  <div
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                      isOut ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{time}</span>
                    {isOut && (
                      <>
                        {msg.status_envio === 'simulada' ? (
                          <span
                            title="Modo de teste: gravada no CRM"
                            className="bg-black/20 dark:bg-white/20 px-1 py-0.2 rounded font-mono text-[9px]"
                          >
                            teste
                          </span>
                        ) : msg.status_envio === 'enviada' || msg.status_envio === 'entregue' ? (
                          <CheckCheck className="size-3 text-emerald-300" />
                        ) : (
                          <Check className="size-3" />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isOut && msg.expand?.autor?.name && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {msg.expand.autor.name}
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Caixa de Digitação / Envio */}
      <form
        onSubmit={handleSend}
        className="border-t border-border p-3 bg-card flex items-end gap-2"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Digite sua resposta... (Pressione Enter para enviar, Shift+Enter para nova linha)"
          rows={2}
          className="min-h-[52px] resize-none text-[13px] py-2"
        />

        <Button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-[52px] px-4 bg-primary text-primary-foreground shrink-0 gap-1.5"
        >
          <Send className="size-4" />
          <span className="hidden sm:inline text-[13px]">{sending ? 'Enviando...' : 'Enviar'}</span>
        </Button>
      </form>
    </div>
  )
}
