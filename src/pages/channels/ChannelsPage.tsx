import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Settings2,
  ArrowLeftRight,
  Trash2,
  KeyRound,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  listChannelConnections,
  archiveChannelConnection,
  updateChannelConnection,
} from '@/services/channels'
import type { ChannelConnection } from '@/types/channels'
import { MetaCredentialsModal } from '@/components/channels/MetaCredentialsModal'

// SVG dos ícones oficiais de WhatsApp e Instagram
function WhatsAppIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"
      />
      <path
        fill="#FFFFFF"
        d="M17.52 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.52-.08-.15-.68-1.63-.92-2.23-.24-.6-.48-.52-.68-.53-.18-.01-.38-.01-.58-.01-.2 0-.52.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.9 1.22 3.1.15.2 2.12 3.24 5.13 4.54.72.31 1.28.5 1.71.64.72.23 1.38.2 1.9.12.58-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.12-.28-.2-.58-.35z"
      />
    </svg>
  )
}

function InstagramIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fill="url(#ig-grad)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
      <defs>
        <radialGradient id="ig-grad" cx="0.2" cy="1" r="1">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export function ChannelsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [connections, setConnections] = useState<ChannelConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [metaModalOpen, setMetaModalOpen] = useState(false)

  const isAdminOrGestor = user?.role === 'admin' || user?.role === 'gestor'
  // Qualquer usuário autenticado pode criar conexões e gerenciar as que ele
  // mesmo criou; admin/gestor gerenciam todas.
  const canManage = Boolean(user)
  const canManageAll = isAdminOrGestor
  const canManageConnection = (conn: ChannelConnection) =>
    canManageAll || (Boolean(user) && conn.owner === user?.id)

  useEffect(() => {
    loadConnections()
  }, [showArchived])

  async function loadConnections() {
    setLoading(true)
    try {
      const data = await listChannelConnections(showArchived)
      setConnections(data)
    } catch {
      toast({
        title: 'Erro ao carregar conexões',
        description: 'Não foi possível consultar os canais cadastrados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(conn: ChannelConnection) {
    if (!canManageConnection(conn)) {
      toast({
        title: 'Ação restrita',
        description: 'Você só pode gerenciar conexões que você mesmo criou.',
        variant: 'destructive',
      })
      return
    }

    const nextStatus = conn.status === 'ativo' ? 'inativo' : 'ativo'
    try {
      await updateChannelConnection(conn.id, { status: nextStatus })
      toast({
        title: 'Status atualizado',
        description: `Canal alterado para "${nextStatus}".`,
      })
      loadConnections()
    } catch {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível modificar o status.',
        variant: 'destructive',
      })
    }
  }

  async function handleToggleConexao(conn: ChannelConnection) {
    if (!canManageConnection(conn)) return
    const nextConexao = conn.conexao_status === 'conectado' ? 'desconectado' : 'conectado'
    try {
      await updateChannelConnection(conn.id, { conexao_status: nextConexao })
      toast({
        title: 'Conexão atualizada',
        description: `Canal agora está "${nextConexao}".`,
      })
      loadConnections()
    } catch {
      toast({
        title: 'Erro ao alternar conexão',
        variant: 'destructive',
      })
    }
  }

  async function handleArchive(conn: ChannelConnection) {
    if (!canManageConnection(conn)) return
    if (!window.confirm(`Deseja arquivar o canal "${conn.name}"?`)) return
    try {
      await archiveChannelConnection(conn.id)
      toast({
        title: 'Canal arquivado',
        description: 'O canal foi desativado e arquivado.',
      })
      loadConnections()
    } catch {
      toast({
        title: 'Erro ao arquivar',
        variant: 'destructive',
      })
    }
  }

  const filtered = useMemo(() => {
    return connections.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.numero_conectado && c.numero_conectado.includes(search))

      const matchesType =
        typeFilter === 'all'
          ? true
          : typeFilter === 'whatsapp'
            ? c.tipo === 'whatsapp' || c.tipo === 'whatsapp_cloud'
            : c.tipo === typeFilter

      return matchesSearch && matchesType
    })
  }, [connections, search, typeFilter])

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
        {/* Topo / Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Conexões</h1>
            <p className="text-[13px] text-muted-foreground">
              Gerencie suas conexões de canais de atendimento (WhatsApp e Instagram Direct)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetaModalOpen(true)}
              className="gap-2 text-[12px] border-border text-foreground hover:bg-muted"
            >
              <KeyRound className="size-4 text-emerald-600" />
              Configurar Meta API
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inbox')}
              className="gap-2 text-[12px] border-border text-foreground hover:bg-muted"
            >
              <MessageSquare className="size-4 text-primary" />
              Caixa de Entrada
            </Button>

            {canManage && (
              <Button
                size="sm"
                onClick={() => navigate('/channels/new')}
                className="gap-1.5 text-[12px] bg-primary text-primary-foreground shadow-sm hover:opacity-95"
              >
                <Plus className="size-4" />
                Criar
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conexões..."
                className="pl-9 h-9 text-[13px] bg-background"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[190px] h-9 text-[13px] bg-background">
                <SelectValue placeholder="Todos os Tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(Boolean(checked))}
            />
            Mostrar canais arquivados
          </label>
        </div>

        {/* Grid de Cards de Conexões */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-border bg-card p-5 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhuma conexão encontrada</h3>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
              Crie sua primeira conexão para receber mensagens do WhatsApp ou Instagram Direct
              diretamente no CRM.
            </p>
            {canManage && (
              <Button
                size="sm"
                onClick={() => navigate('/channels/new')}
                className="mt-4 gap-1.5 text-[12px]"
              >
                <Plus className="size-4" /> Criar Conexão
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((conn) => {
              const isWa = conn.tipo === 'whatsapp' || conn.tipo === 'whatsapp_cloud'
              const isIg = conn.tipo === 'instagram'

              const tipoLabel =
                conn.tipo === 'whatsapp_cloud'
                  ? 'WhatsApp Oficial (Cloud API)'
                  : conn.tipo === 'whatsapp'
                    ? 'WhatsApp'
                    : 'Instagram (Beta)'

              const isAtivo = conn.status === 'ativo'
              const isConectado = conn.conexao_status === 'conectado'

              return (
                <div
                  key={conn.id}
                  className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-border/80 flex flex-col justify-between"
                >
                  {/* Header do Card */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60">
                          {isWa ? (
                            <WhatsAppIcon className="size-5" />
                          ) : (
                            <InstagramIcon className="size-5" />
                          )}
                        </div>
                        <h3
                          className="font-semibold text-[15px] text-foreground truncate"
                          title={conn.name}
                        >
                          {conn.name}
                        </h3>
                      </div>

                      {/* Ações superiores */}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {canManageConnection(conn) && (
                          <>
                            <button
                              onClick={() => navigate(`/channels/${conn.id}/edit`)}
                              title="Editar Configurações"
                              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition"
                            >
                              <Settings2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleToggleConexao(conn)}
                              title="Alternar Conexão"
                              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition"
                            >
                              <ArrowLeftRight className="size-4" />
                            </button>
                            <button
                              onClick={() => handleArchive(conn)}
                              title="Arquivar Canal"
                              className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detalhes do Card em Linhas Chave/Valor */}
                    <div className="mt-4 space-y-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-medium text-foreground">{tipoLabel}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <button
                          onClick={() => handleToggleStatus(conn)}
                          disabled={!canManageConnection(conn)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            isAtivo
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:opacity-80'
                              : 'bg-muted text-muted-foreground border border-border hover:opacity-80'
                          }`}
                        >
                          {isAtivo ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Conexão</span>
                        <button
                          onClick={() => handleToggleConexao(conn)}
                          disabled={!canManageConnection(conn)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            isConectado
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isConectado ? 'Conectado' : 'Desconectado'}
                        </button>
                      </div>

                      {conn.numero_conectado ? (
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">Número conectado</span>
                          <span className="font-mono text-[12px] font-medium text-foreground">
                            {conn.numero_conectado}
                          </span>
                        </div>
                      ) : isIg ? (
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">Conta conectada</span>
                          <span className="text-[12px] text-muted-foreground italic">
                            Via Instagram Direct
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Visibilidade:{' '}
                      {conn.visibilidade === 'organizacao' ? 'Organização' : conn.visibilidade}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate('/inbox')}
                      className="h-7 text-[12px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      Ver conversas
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Banner Informativo no Rodapé */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>
              As mensagens recebidas criam automaticamente contatos e conversas na Caixa de Entrada.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMetaModalOpen(true)}
            className="text-[12px] shrink-0"
          >
            Ver instruções de Webhook da Meta
          </Button>
        </div>

        <MetaCredentialsModal open={metaModalOpen} onClose={() => setMetaModalOpen(false)} />
      </div>
    </div>
  )
}
