import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useCrm } from '@/contexts/CrmContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  createChannelConnection,
  getChannelConnection,
  updateChannelConnection,
} from '@/services/channels'
import type {
  ChannelTipo,
  ChannelStatus,
  ChannelConexaoStatus,
  ChannelVisibilidade,
  ChannelAssinaturaPosicao,
} from '@/types/channels'

export function ChannelFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id } = useParams()
  const { toast } = useToast()
  const { stages, users } = useCrm()
  const { user } = useAuth()

  const isEditing = Boolean(id)
  const initialTipo = (searchParams.get('tipo') as ChannelTipo) || 'whatsapp_cloud'

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  // Campos do formulário (conforme captura 3)
  const [tipo, setTipo] = useState<ChannelTipo>(initialTipo)
  const [name, setName] = useState('')
  const [numeroConectado, setNumeroConectado] = useState('')
  const [identificadorExterno, setIdentificadorExterno] = useState('')
  const [equipePadrao, setEquipePadrao] = useState<string>('geral')
  const [funilPadrao, setFunilPadrao] = useState<string>('comercial')
  const [estagioAbrirChat, setEstagioAbrirChat] = useState<string>('none')
  const [estagioFecharChat, setEstagioFecharChat] = useState<string>('none')
  const [status, setStatus] = useState<ChannelStatus>('inativo')
  const [visibilidade, setVisibilidade] = useState<ChannelVisibilidade>('organizacao')
  const [assinaturaTexto, setAssinaturaTexto] = useState('')
  const [assinaturaPosicao, setAssinaturaPosicao] = useState<ChannelAssinaturaPosicao>('rodape')
  const [rejeitarLigacoes, setRejeitarLigacoes] = useState(false)

  useEffect(() => {
    if (isEditing && id) {
      loadExisting(id)
    }
  }, [id, isEditing])

  async function loadExisting(connectionId: string) {
    setLoading(true)
    try {
      const data = await getChannelConnection(connectionId)
      setTipo(data.tipo)
      setName(data.name)
      setNumeroConectado(data.numero_conectado || '')
      setIdentificadorExterno(data.identificador_externo || '')
      setEquipePadrao(data.equipe_padrao || 'geral')
      setFunilPadrao(data.funil_padrao || 'comercial')
      setEstagioAbrirChat(data.estagio_abrir_chat || 'none')
      setEstagioFecharChat(data.estagio_fechar_chat || 'none')
      setStatus(data.status)
      setVisibilidade(data.visibilidade || 'organizacao')
      setAssinaturaTexto(data.assinatura_texto || '')
      setAssinaturaPosicao(data.assinatura_posicao || 'rodape')
      setRejeitarLigacoes(Boolean(data.rejeitar_ligacoes))
    } catch {
      toast({
        title: 'Erro ao carregar canal',
        description: 'Não foi possível buscar as configurações.',
        variant: 'destructive',
      })
      navigate('/channels')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome da conexão.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const conexaoStatus: ChannelConexaoStatus = status === 'ativo' ? 'conectado' : 'desconectado'
      const payload = {
        owner: user?.id,
        name: name.trim(),
        tipo,
        status,
        conexao_status: conexaoStatus,
        numero_conectado: numeroConectado.trim() || undefined,
        identificador_externo: identificadorExterno.trim() || undefined,
        equipe_padrao: equipePadrao === 'geral' ? '' : equipePadrao,
        funil_padrao: funilPadrao === 'comercial' ? '' : funilPadrao,
        estagio_abrir_chat: estagioAbrirChat === 'none' ? '' : estagioAbrirChat,
        estagio_fechar_chat: estagioFecharChat === 'none' ? '' : estagioFecharChat,
        visibilidade,
        assinatura_texto: assinaturaTexto.trim() || '',
        assinatura_posicao: assinaturaPosicao,
        rejeitar_ligacoes: rejeitarLigacoes,
      }

      if (isEditing && id) {
        await updateChannelConnection(id, payload)
        toast({
          title: 'Conexão atualizada',
          description: 'As configurações foram salvas com sucesso.',
        })
      } else {
        await createChannelConnection(payload)
        toast({
          title: 'Conexão criada',
          description: 'O canal foi registrado e está pronto para uso.',
        })
      }

      navigate('/channels')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar conexão.'
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-0 w-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground animate-pulse">
          Carregando configurações do canal...
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 sm:p-6">
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Botão Voltar + Título */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/channels')}
            className="size-8 p-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Editar Conexão' : 'Configurar Nova Conexão'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            <h2 className="text-[15px] font-semibold text-foreground border-b border-border pb-3">
              Configurações de Integração
            </h2>

            {/* Nome da Conexão * */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Nome da Conexão <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome do canal"
                required
                className="h-10 text-[13px]"
              />
            </div>

            {/* Número Conectado / ID Externo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {tipo === 'instagram' ? 'Nome da Conta Instagram' : 'Número do Telefone'}
                </label>
                <Input
                  value={numeroConectado}
                  onChange={(e) => setNumeroConectado(e.target.value)}
                  placeholder={tipo === 'instagram' ? '@suaconta' : '+55 (11) 99999-9999'}
                  className="h-10 text-[13px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Exibido no card da conexão para identificação da equipe.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  {tipo === 'whatsapp_cloud'
                    ? 'Phone Number ID (Meta)'
                    : tipo === 'instagram'
                      ? 'Instagram Account ID'
                      : 'Identificador / Sessão'}
                </label>
                <Input
                  value={identificadorExterno}
                  onChange={(e) => setIdentificadorExterno(e.target.value)}
                  placeholder="Ex: 104839281728192"
                  className="h-10 text-[13px] font-mono text-[12px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Usado pelo webhook oficial da Meta para rotear as mensagens para este canal.
                </p>
              </div>
            </div>

            {/* Equipe Padrão * */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Equipe Padrão <span className="text-destructive">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground">
                A equipe padrão é a equipe que será selecionada por padrão para atender novas
                conversas.
              </p>
              <Select value={equipePadrao} onValueChange={setEquipePadrao}>
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue placeholder="Selecione a equipe padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Equipe Comercial Geral</SelectItem>
                  <SelectItem value="pos_venda">Pós-Venda / Suporte</SelectItem>
                  <SelectItem value="atendimento">Recepção & Atendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Funil Padrão * */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Funil Padrão <span className="text-destructive">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground">
                O funil padrão é o funil que será selecionado por padrão para novas conversas.
              </p>
              <Select value={funilPadrao} onValueChange={setFunilPadrao}>
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue placeholder="Selecione o funil padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Funil Principal de Vendas</SelectItem>
                  <SelectItem value="recuperacao">Funil de Recuperação</SelectItem>
                  <SelectItem value="onboarding">Onboarding / Implantação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Automação de funil */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Automação de funil</h3>
                <p className="text-[11px] text-muted-foreground">
                  Mova o cliente automaticamente para um estágio quando o chat abrir ou fechar. A
                  movimentação troca o estágio dentro do mesmo funil — não duplica.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground">
                    Estágio ao abrir o chat
                  </label>
                  <Select value={estagioAbrirChat} onValueChange={setEstagioAbrirChat}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue placeholder="Não mover automaticamente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não mover automaticamente</SelectItem>
                      {stages.map((stg) => (
                        <SelectItem key={stg.id} value={stg.id}>
                          {stg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground">
                    Estágio ao fechar o chat
                  </label>
                  <Select value={estagioFecharChat} onValueChange={setEstagioFecharChat}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue placeholder="Não mover automaticamente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não mover automaticamente</SelectItem>
                      {stages.map((stg) => (
                        <SelectItem key={stg.id} value={stg.id}>
                          {stg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status do Canal * */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Status do Canal <span className="text-destructive">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground">
                O status determina se o canal está habilitado para receber mensagens.
              </p>
              <Select value={status} onValueChange={(val) => setStatus(val as ChannelStatus)}>
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                  </SelectItem>
                  <SelectItem value="inativo">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-muted-foreground" />
                      Inativo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground italic">
                Canais inativos não receberão novas mensagens nem processarão webhooks.
              </p>
            </div>

            {/* Visibilidade */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Visibilidade</label>
              <p className="text-[12px] text-muted-foreground">
                Defina quem pode ver e usar este canal.
              </p>
              <Select
                value={visibilidade}
                onValueChange={(val) => setVisibilidade(val as ChannelVisibilidade)}
              >
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue placeholder="Organização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizacao">Organização (Todos os membros)</SelectItem>
                  <SelectItem value="equipe">Equipe Específica</SelectItem>
                  <SelectItem value="privado">Privado (Apenas administradores)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assinatura de Mensagem */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Assinatura de Mensagem
              </label>
              <Textarea
                value={assinaturaTexto}
                onChange={(e) => setAssinaturaTexto(e.target.value)}
                placeholder="Ex: Atenciosamente, Equipe de Atendimento"
                rows={3}
                className="text-[13px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Use{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">
                  {'{{nickname}}'}
                </code>{' '}
                para inserir automaticamente o nome do atendente.
              </p>
            </div>

            {/* Posição da Assinatura */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Posição da Assinatura
              </label>
              <Select
                value={assinaturaPosicao}
                onValueChange={(val) => setAssinaturaPosicao(val as ChannelAssinaturaPosicao)}
              >
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue placeholder="No rodapé da mensagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rodape">No rodapé da mensagem</SelectItem>
                  <SelectItem value="topo">No topo da mensagem</SelectItem>
                  <SelectItem value="nenhuma">Não incluir assinatura</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Escolha onde a assinatura aparecerá na mensagem.
              </p>
            </div>

            {/* Configurações de Ligações */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <h3 className="text-[13px] font-semibold text-foreground">
                Configurações de Ligações
              </h3>
              <label className="flex items-start gap-2.5 text-[13px] text-foreground cursor-pointer select-none">
                <Checkbox
                  checked={rejeitarLigacoes}
                  onCheckedChange={(checked) => setRejeitarLigacoes(Boolean(checked))}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium">Rejeitar ligações automaticamente</span>
                  <p className="text-[11px] text-muted-foreground">
                    Quando ativado, as ligações recebidas serão rejeitadas automaticamente e uma
                    mensagem será enviada.
                  </p>
                </div>
              </label>
            </div>

            {/* Dica da captura */}
            <div className="rounded-lg bg-muted/50 p-3 text-[12px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>
                Salve as configurações do canal. As credenciais oficiais são lidas com segurança dos
                segredos do backend da Meta.
              </span>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/channels')}
              disabled={saving}
              className="text-[13px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="text-[13px] bg-primary text-primary-foreground min-w-[100px]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
