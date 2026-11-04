import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  MessageSquare,
  Plus,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Bot,
  Mail,
  Reply,
  CheckCheck,
  Users2,
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
import { useAuth } from '@/contexts/AuthContext'
import {
  listChannelConversations,
  listChannelConnections,
  listLastMessagesByConversations,
} from '@/services/channels'
import type { ChannelConnection, ChannelConversation } from '@/types/channels'
import { ChatArea } from '@/components/channels/ChatArea'
import { NewConversationModal } from '@/components/channels/NewConversationModal'
import { MetaCredentialsModal } from '@/components/channels/MetaCredentialsModal'

type MainFilterTab = 'todas' | 'minhas' | 'nao_atribuidas' | 'fechadas' | 'grupos'

export function InboxPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChannelConversation[]>([])
  const [connections, setConnections] = useState<ChannelConnection[]>([])
  const [lastMessagesMap, setLastMessagesMap] = useState<
    Record<string, { direcao: string; texto: string; created: string }>
  >({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<MainFilterTab>('todas')
  const [connectionFilter, setConnectionFilter] = useState('all')

  // Filtros rápidos em ícones (segunda linha)
  const [filterIa, setFilterIa] = useState(false)
  const [filterNaoLidas, setFilterNaoLidas] = useState(false)
  const [filterNaoRespondidas, setFilterNaoRespondidas] = useState(false)
  const [filterResolvidas, setFilterResolvidas] = useState(false)

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [metaModalOpen, setMetaModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [convs, conns, lastMsgs] = await Promise.all([
        listChannelConversations(),
        listChannelConnections(),
        listLastMessagesByConversations(),
      ])
      setConversations(convs)
      setConnections(conns)
      setLastMessagesMap(lastMsgs)
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
      const [convs, lastMsgs] = await Promise.all([
        listChannelConversations(),
        listLastMessagesByConversations(),
      ])
      setConversations(convs)
      setLastMessagesMap(lastMsgs)
    } catch {
      /* intentionally ignored */
    }
  }

  // Contadores para as abas
  const tabCounts = useMemo(() => {
    const currentUserId = user?.id || ''
    return {
      todas: conversations.length,
      minhas: conversations.filter((c) => c.responsavel === currentUserId).length,
      nao_atribuidas: conversations.filter((c) => !c.responsavel).length,
      fechadas: conversations.filter((c) => c.status === 'fechada').length,
      grupos: conversations.filter((c) => Boolean(c.is_grupo)).length,
    }
  }, [conversations, user])

  const filteredConversations = useMemo(() => {
    const currentUserId = user?.id || ''

    return conversations.filter((c) => {
      // 1. Busca por nome, identificador ou última mensagem
      const matchesSearch =
        !search.trim() ||
        c.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente_identificador.includes(search) ||
        (c.ultima_mensagem && c.ultima_mensagem.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false

      // 2. Filtro do Canal selecionado
      if (connectionFilter !== 'all' && c.connection !== connectionFilter) {
        return false
      }

      // 3. Aba Principal: Todas, Minhas, Não atribuídas, Fechadas, Grupos
      if (activeTab === 'minhas') {
        if (c.responsavel !== currentUserId) return false
      } else if (activeTab === 'nao_atribuidas') {
        if (c.responsavel) return false
      } else if (activeTab === 'fechadas') {
        if (c.status !== 'fechada') return false
      } else if (activeTab === 'grupos') {
        if (!c.is_grupo) return false
      } else {
        // 'todas'
      }

      // 4. Filtros rápidos da segunda linha (podem refinar a busca)
      if (filterNaoLidas && (c.nao_lidas || 0) <= 0) {
        return false
      }

      if (filterNaoRespondidas) {
        // Não respondida = última mensagem foi enviada pelo cliente (direcao = entrada)
        const lastMsg = lastMessagesMap[c.id]
        const isClientLast = lastMsg ? lastMsg.direcao === 'entrada' : true
        if (!isClientLast) return false
      }

      if (filterResolvidas && c.status !== 'fechada') {
        return false
      }

      if (filterIa) {
        // Se ativado filtro IA: conversas onde a última mensagem contém indicação de IA ou notas automáticas
        const text = (c.ultima_mensagem || '').toLowerCase()
        const isIaRelated =
          text.includes('ia') || text.includes('assistente') || text.includes('bot')
        if (!isIaRelated) return false
      }

      return true
    })
  }, [
    conversations,
    search,
    activeTab,
    connectionFilter,
    filterNaoLidas,
    filterNaoRespondidas,
    filterResolvidas,
    filterIa,
    lastMessagesMap,
    user,
  ])

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || null
  }, [conversations, selectedId])

  const totalNaoLidas = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.nao_lidas || 0), 0)
  }, [conversations])

  return (
    <div className="flex h-full min-h-0 w-full flex-col p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
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
          {/* Busca e Filtros com Abas Circuladas na Referência */}
          <div className="p-3 border-b border-border space-y-2.5">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar conversas..."
                className="pl-8 h-8 text-[12px] bg-background"
              />
            </div>

            {/* Linha 1: Abas Principais (Todas, Minhas, Não atribuídas, Fechadas, Grupos) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('todas')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'todas'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Todas
                <span className="opacity-70 text-[10px]">({tabCounts.todas})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('minhas')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'minhas'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Minhas
                <span className="opacity-70 text-[10px]">({tabCounts.minhas})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('nao_atribuidas')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'nao_atribuidas'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Não atribuídas
                <span className="opacity-70 text-[10px]">({tabCounts.nao_atribuidas})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fechadas')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'fechadas'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Fechadas
                <span className="opacity-70 text-[10px]">({tabCounts.fechadas})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grupos')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'grupos'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Grupos
                <span className="opacity-70 text-[10px]">({tabCounts.grupos})</span>
              </button>
            </div>

            {/* Linha 2: Filtros Rápidos com Ícones (IA, Não lidas, Não respondidas, Resolvidas) */}
            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-border/50 text-[11px]">
              <div className="flex items-center gap-1 flex-wrap">
                {/* Botão IA */}
                <button
                  type="button"
                  onClick={() => setFilterIa((prev) => !prev)}
                  title="Filtrar conversas com IA / automação"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors border ${
                    filterIa
                      ? 'bg-primary/15 text-primary border-primary/30 font-medium'
                      : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Bot className="size-3" />
                  <span>IA</span>
                </button>

                {/* Botão Não lidas */}
                <button
                  type="button"
                  onClick={() => setFilterNaoLidas((prev) => !prev)}
                  title="Filtrar conversas com mensagens não lidas"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors border ${
                    filterNaoLidas
                      ? 'bg-primary/15 text-primary border-primary/30 font-medium'
                      : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Mail className="size-3" />
                  <span>Não lidas</span>
                </button>

                {/* Botão Não respondidas */}
                <button
                  type="button"
                  onClick={() => setFilterNaoRespondidas((prev) => !prev)}
                  title="Filtrar conversas aguardando resposta da equipe"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors border ${
                    filterNaoRespondidas
                      ? 'bg-primary/15 text-primary border-primary/30 font-medium'
                      : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Reply className="size-3" />
                  <span>Não respondidas</span>
                </button>

                {/* Botão Verificado / Resolvido */}
                <button
                  type="button"
                  onClick={() => setFilterResolvidas((prev) => !prev)}
                  title="Filtrar conversas resolvidas / finalizadas"
                  className={`inline-flex items-center justify-center p-1 rounded transition-colors border ${
                    filterResolvidas
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <CheckCheck className="size-3.5" />
                </button>
              </div>

              {/* Seletor de Canal compacto */}
              {connections.length > 0 && (
                <Select value={connectionFilter} onValueChange={setConnectionFilter}>
                  <SelectTrigger className="h-6 text-[10px] w-[110px] bg-background py-0 px-2">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos canais</SelectItem>
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
                {activeTab === 'grupos' ? (
                  <>
                    <Users2 className="size-6 mx-auto mb-2 opacity-40 text-primary" />
                    <p className="text-[13px] font-medium text-foreground">Nenhum grupo ativo</p>
                    <p className="text-[11px] mt-0.5 max-w-xs mx-auto">
                      Atualmente não há conversas em grupo conectadas nos canais de WhatsApp ou
                      Instagram. Os atendimentos são individuais.
                    </p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
                    <p className="text-[13px] font-medium text-foreground">
                      Nenhuma conversa encontrada
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {search || activeTab !== 'todas' || filterNaoLidas || filterNaoRespondidas
                        ? 'Nenhuma conversa corresponde aos filtros selecionados.'
                        : 'Clique em "Nova Conversa / Testar" para simular ou aguarde mensagens dos canais.'}
                    </p>
                  </>
                )}
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
