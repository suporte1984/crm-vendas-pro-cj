import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  MessageSquare,
  Plus,
  KeyRound,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { listChannelConversations, listChannelConnections } from '@/services/channels'
import type { ChannelConnection, ChannelConversation } from '@/types/channels'
import { ChatArea } from '@/components/channels/ChatArea'
import { NewConversationModal } from '@/components/channels/NewConversationModal'
import { MetaCredentialsModal } from '@/components/channels/MetaCredentialsModal'

export function InboxPage() {
  const { toast } = useToast()
  const [conversations, setConversations] = useState<ChannelConversation[]>([])
  const [connections, setConnections] = useState<ChannelConnection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [connectionFilter, setConnectionFilter] = useState('all')

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [metaModalOpen, setMetaModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [convs, conns] = await Promise.all([
        listChannelConversations(),
        listChannelConnections(),
      ])
      setConversations(convs)
      setConnections(conns)
      if (convs.length > 0 && !selectedId) {
        setSelectedId(convs[0].id)
      }
    } catch {
      toast({
        title: 'Erro ao carregar conversas',
        description: 'Não foi possível carregar a caixa de entrada.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function refreshConversations() {
    try {
      const convs = await listChannelConversations()
      setConversations(convs)
    } catch {
      /* intentionally ignored */
    }
  }

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        c.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente_identificador.includes(search) ||
        (c.ultima_mensagem && c.ultima_mensagem.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus =
        statusFilter === 'todas'
          ? true
          : statusFilter === 'nao_lidas'
            ? c.nao_lidas > 0
            : c.status === statusFilter

      const matchesConn = connectionFilter === 'all' ? true : c.connection === connectionFilter

      return matchesSearch && matchesStatus && matchesConn
    })
  }, [conversations, search, statusFilter, connectionFilter])

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || null
  }, [conversations, selectedId])

  const totalNaoLidas = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.nao_lidas || 0), 0)
  }, [conversations])

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-4">
      {/* Topo / Barra de Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Caixa de Entrada</h1>
          {totalNaoLidas > 0 && (
            <Badge variant="destructive" className="font-mono text-[11px] px-2">
              {totalNaoLidas} não lida{totalNaoLidas > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMetaModalOpen(true)}
            className="gap-1.5 text-[12px] h-9"
          >
            <KeyRound className="size-3.5 text-emerald-600" />
            Meta API
          </Button>

          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="gap-1.5 text-[12px] h-9 bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
            Nova Conversa / Testar
          </Button>
        </div>
      </div>

      {/* Layout Split: Lista de Conversas à esquerda + Chat à direita */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Coluna da Esquerda: Filtros e Lista de Conversas */}
        <div className="flex w-full sm:w-[320px] md:w-[360px] flex-col border-r border-border shrink-0 bg-card">
          {/* Busca e Filtros */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone ou texto..."
                className="pl-8 h-8 text-[12px] bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-[11px] flex-1 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as conversas</SelectItem>
                  <SelectItem value="nao_lidas">Apenas não lidas</SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="fechada">Fechadas</SelectItem>
                </SelectContent>
              </Select>

              {connections.length > 0 && (
                <Select value={connectionFilter} onValueChange={setConnectionFilter}>
                  <SelectTrigger className="h-7 text-[11px] flex-1 bg-background">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os canais</SelectItem>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Lista de Conversas com Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {loading ? (
              <div className="p-6 text-center text-[12px] text-muted-foreground animate-pulse">
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
                <p className="text-[13px] font-medium text-foreground">Nenhuma conversa</p>
                <p className="text-[11px] mt-0.5">
                  Clique em &quot;Nova Conversa / Testar&quot; para simular ou aguarde mensagens dos
                  canais.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId
                const isWa =
                  conv.expand?.connection?.tipo === 'whatsapp' ||
                  conv.expand?.connection?.tipo === 'whatsapp_cloud'

                const timeStr = conv.ultima_mensagem_em
                  ? new Date(conv.ultima_mensagem_em).toLocaleDateString([], {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 hover:bg-muted/40 ${
                      isSelected ? 'bg-muted/70 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    {/* Avatar do Cliente */}
                    <div className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-[13px]">
                      {conv.cliente_nome.charAt(0).toUpperCase()}
                      {conv.nao_lidas > 0 && (
                        <span className="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                          {conv.nao_lidas}
                        </span>
                      )}
                    </div>

                    {/* Dados do Cliente */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-[13px] truncate ${
                            conv.nao_lidas > 0
                              ? 'font-bold text-foreground'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          {conv.cliente_nome}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {conv.cliente_identificador}
                      </p>

                      <p
                        className={`text-[12px] truncate mt-1 ${
                          conv.nao_lidas > 0
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {conv.ultima_mensagem || 'Sem mensagens'}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span
                          className={`size-1.5 rounded-full ${
                            isWa ? 'bg-emerald-500' : 'bg-pink-500'
                          }`}
                        />
                        <span className="truncate">
                          {conv.expand?.connection?.name || (isWa ? 'WhatsApp' : 'Instagram')}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Coluna da Direita: Área do Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {selectedConversation ? (
            <ChatArea
              conversation={selectedConversation}
              onUpdated={refreshConversations}
              onOpenMetaModal={() => setMetaModalOpen(true)}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
              <div>
                <MessageSquare className="size-12 mx-auto text-primary/40 mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  Selecione uma conversa para atender
                </h3>
                <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
                  Escolha um cliente na lista à esquerda para ler o histórico e responder
                  diretamente pelo CRM.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais auxiliares */}
      <NewConversationModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        connections={connections}
        onCreated={(newConv) => {
          refreshConversations()
          setSelectedId(newConv.id)
        }}
      />

      <MetaCredentialsModal open={metaModalOpen} onClose={() => setMetaModalOpen(false)} />
    </div>
  )
}
