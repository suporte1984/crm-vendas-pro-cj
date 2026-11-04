import { useState, useEffect, useRef } from 'react'
import {
  Send,
  Phone,
  CheckCheck,
  Check,
  AlertCircle,
  Sparkles,
  KeyRound,
  ExternalLink,
  Paperclip,
  Smile,
  Mic,
  Lock,
  FileText,
  Download,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import {
  listChannelMessages,
  sendChannelMessage,
  sendChannelAttachmentMessage,
  markConversationAsRead,
  updateConversationStatus,
} from '@/services/channels'
import { FormattingToolbar } from './FormattingToolbar'
import type { ChannelConversation, ChannelMessage } from '@/types/channels'

const QUICK_EMOJIS = [
  '😊',
  '👍',
  '🙏',
  '❤️',
  '👋',
  '🎯',
  '🔥',
  '🚀',
  '✅',
  '⭐',
  '🤝',
  '💼',
  '📞',
  '💬',
  '🎉',
  '👏',
  '💡',
  '⏰',
  '📅',
  '📍',
  '💰',
  '📊',
  '🛡️',
  '✨',
  '😅',
  '🙌',
  '👀',
  '💯',
  '🤔',
  '💪',
  '👌',
  '🤩',
]

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
  const [mode, setMode] = useState<'responder' | 'nota_privada'>('responder')
  const [sending, setSending] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [testModeWarning, setTestModeWarning] = useState(false)
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  // Aplicador de formatação WhatsApp (*negrito*, _itálico_, ~tachado~, ```código```)
  function handleApplyFormat(prefix: string, suffix = '') {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = text.substring(start, end)

    let newText = ''
    let newCursorPos = 0

    if (selectedText.length > 0) {
      // Envolve o texto selecionado
      newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
      newCursorPos = start + prefix.length + selectedText.length + suffix.length
    } else {
      // Insere marcadores e posiciona o cursor no meio
      newText = text.substring(0, start) + prefix + suffix + text.substring(end)
      newCursorPos = start + prefix.length
    }

    setText(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  function handleInsertEmoji(emoji: string) {
    const textarea = textareaRef.current
    if (!textarea) {
      setText((prev) => prev + emoji)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newText = text.substring(0, start) + emoji + text.substring(end)
    const newPos = start + emoji.length

    setText(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAttachment(true)
    try {
      await sendChannelAttachmentMessage({
        conversationId: conversation.id,
        file,
        caption: text.trim() || undefined,
        isPrivate: mode === 'nota_privada',
      })

      setText('')
      toast({
        title: mode === 'nota_privada' ? 'Nota com anexo gravada' : 'Arquivo anexado com sucesso',
        description: `${file.name} foi adicionado à conversa.`,
      })

      await loadMessages()
      onUpdated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao anexar arquivo.'
      toast({
        title: 'Erro no anexo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const content = text.trim()
    if (!content || sending || uploadingAttachment) return

    setSending(true)
    const isPrivateNote = mode === 'nota_privada'

    try {
      const res = await sendChannelMessage(conversation.id, content, {
        isPrivate: isPrivateNote,
      })
      setText('')

      if (isPrivateNote) {
        toast({
          title: 'Nota interna gravada',
          description: 'A nota foi registrada e fica visível apenas para os membros da equipe.',
        })
      } else if (res.is_simulated) {
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
            const isPrivate = msg.tipo_mensagem === 'nota_privada'
            const time = new Date(msg.created).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            const fileUrl = msg.anexo
              ? `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/channel_messages/${msg.id}/${msg.anexo}`
              : null
            const isImage =
              msg.anexo && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.anexo || msg.nome_anexo || '')

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isPrivate ? 'items-center my-2' : isOut ? 'items-end' : 'items-start'
                }`}
              >
                {/* Se for NOTA PRIVADA: card amarelo/âmbar com destaque e badge de cadeado */}
                {isPrivate ? (
                  <div className="w-[90%] max-w-[580px] rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 shadow-xs text-amber-950 dark:text-amber-200">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-1.5 mb-1.5 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        <Lock className="size-3" />
                        Nota Privada (Equipe)
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">{time}</span>
                    </div>

                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.texto}</p>

                    {/* Exibição de Anexo dentro da nota privada */}
                    {fileUrl && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20">
                        {isImage ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[280px] overflow-hidden rounded-lg border border-amber-500/30"
                          >
                            <img
                              src={fileUrl}
                              alt={msg.nome_anexo || 'Anexo'}
                              className="w-full h-auto object-cover max-h-48"
                            />
                          </a>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.nome_anexo || 'anexo'}
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                          >
                            <FileText className="size-4 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {msg.nome_anexo || 'Baixar arquivo'}
                            </span>
                            <Download className="size-3.5 shrink-0 opacity-70" />
                          </a>
                        )}
                      </div>
                    )}

                    {msg.expand?.autor?.name && (
                      <div className="mt-1 text-right text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                        Por: {msg.expand.autor.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] leading-relaxed break-words ${
                      isOut
                        ? 'bg-primary text-primary-foreground rounded-br-xs'
                        : 'bg-card border border-border text-foreground rounded-bl-xs'
                    }`}
                  >
                    {/* Anexo se existir */}
                    {fileUrl && (
                      <div className="mb-2">
                        {isImage ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[280px] overflow-hidden rounded-lg border border-white/20"
                          >
                            <img
                              src={fileUrl}
                              alt={msg.nome_anexo || 'Anexo'}
                              className="w-full h-auto object-cover max-h-48"
                            />
                          </a>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.nome_anexo || 'anexo'}
                            className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                              isOut
                                ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            <FileText className="size-4 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {msg.nome_anexo || 'Baixar arquivo'}
                            </span>
                            <Download className="size-3.5 shrink-0 opacity-70" />
                          </a>
                        )}
                      </div>
                    )}

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
                )}

                {isOut && !isPrivate && msg.expand?.autor?.name && (
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

      {/* Caixa de Digitação / Envio com Barra de Formatação */}
      <form
        onSubmit={handleSend}
        className={`border-t border-border bg-card flex flex-col transition-colors ${
          mode === 'nota_privada' ? 'bg-amber-500/5' : ''
        }`}
      >
        {/* Barra Superior: Formatação (B, I, S, <\>, ...), Emojis e Modos Responder/Mensagem Privada */}
        <FormattingToolbar
          mode={mode}
          onModeChange={setMode}
          onApplyFormat={handleApplyFormat}
          onInsertEmoji={handleInsertEmoji}
        />

        {/* Banner informativo quando modo Mensagem Privada estiver ativo */}
        {mode === 'nota_privada' && (
          <div className="bg-amber-500/15 border-b border-amber-500/20 px-3 py-1 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
            <Lock className="size-3 text-amber-600 shrink-0" />
            <span>
              <strong>Modo Mensagem Privada:</strong> O texto digitado será salvo apenas como nota
              interna para sua equipe e <u>NÃO</u> será enviado ao cliente.
            </span>
          </div>
        )}

        {/* Linha de Input e Ações */}
        <div className="p-3 flex items-end gap-2">
          {/* Botão de Anexo (Clip) */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAttachment}
            title="Anexar arquivo ou imagem"
            className="size-9 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 transition-colors shrink-0"
          >
            <Paperclip className="size-4" />
          </button>

          {/* Textarea principal */}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              mode === 'nota_privada'
                ? 'Digite uma nota interna para a equipe... (Enter para salvar)'
                : 'Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)'
            }
            rows={2}
            className={`min-h-[50px] resize-none text-[13px] py-2 bg-background flex-1 ${
              mode === 'nota_privada' ? 'border-amber-500/50 focus-visible:ring-amber-500/30' : ''
            }`}
          />

          {/* Botões de Ação à Direita: Emoji, Microfone e Enviar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Popover de Emojis */}
            <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Inserir emoji"
                  className="size-9 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 transition-colors"
                >
                  <Smile className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5 px-1">
                  Selecione um Emoji
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        handleInsertEmoji(emoji)
                        setEmojiPopoverOpen(false)
                      }}
                      className="size-7 rounded text-base hover:bg-muted grid place-items-center transition-transform active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Botão de Microfone com Tooltip explicativo */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    aria-label="Gravar áudio"
                    className="size-9 rounded-md grid place-items-center text-muted-foreground/40 border border-border/40 cursor-not-allowed"
                  >
                    <Mic className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px] max-w-xs">
                  O envio direto de áudio por microfone requer serviço de gravação de mídia e
                  armazenamento OGG/Opus compatível com WhatsApp. Use o botão de anexo para enviar
                  arquivos de áudio gravados.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão de Enviar (Ícone de avião de papel como na referência) */}
            <Button
              type="submit"
              disabled={(!text.trim() && !uploadingAttachment) || sending}
              className={`h-9 px-3.5 shrink-0 gap-1.5 ${
                mode === 'nota_privada'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-primary text-primary-foreground'
              }`}
              title={mode === 'nota_privada' ? 'Salvar nota interna' : 'Enviar mensagem'}
            >
              <Send className="size-4" />
              <span className="hidden sm:inline text-[12px] font-medium">
                {sending
                  ? 'Enviando...'
                  : uploadingAttachment
                    ? 'Anexando...'
                    : mode === 'nota_privada'
                      ? 'Salvar Nota'
                      : 'Enviar'}
              </span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
