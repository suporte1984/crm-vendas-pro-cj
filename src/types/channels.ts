export type ChannelTipo = 'whatsapp' | 'whatsapp_cloud' | 'instagram'

export type ChannelStatus = 'ativo' | 'inativo' | 'arquivado'

export type ChannelConexaoStatus = 'conectado' | 'desconectado' | 'aguardando_credenciais'

export type ChannelVisibilidade = 'organizacao' | 'equipe' | 'privado'

export type ChannelAssinaturaPosicao = 'rodape' | 'topo' | 'nenhuma'

export interface ChannelConnection {
  id: string
  name: string
  tipo: ChannelTipo
  status: ChannelStatus
  conexao_status: ChannelConexaoStatus
  numero_conectado?: string
  identificador_externo?: string
  equipe_padrao?: string
  funil_padrao?: string
  estagio_abrir_chat?: string
  estagio_fechar_chat?: string
  visibilidade: ChannelVisibilidade
  assinatura_texto?: string
  assinatura_posicao?: ChannelAssinaturaPosicao
  rejeitar_ligacoes?: boolean
  owner?: string
  created: string
  updated: string
  expand?: {
    owner?: {
      id: string
      name?: string
      email?: string
    }
  }
}

export type ConversationStatus = 'aberta' | 'fechada' | 'aguardando' | 'arquivada'

export interface ChannelConversation {
  id: string
  connection: string
  contact?: string
  cliente_nome: string
  cliente_identificador: string
  ultima_mensagem?: string
  ultima_mensagem_em?: string
  nao_lidas: number
  status: ConversationStatus
  responsavel?: string
  is_grupo?: boolean
  created: string
  updated: string
  expand?: {
    connection?: ChannelConnection
    contact?: {
      id: string
      name: string
      email?: string
      phone?: string
      company?: string
    }
    responsavel?: {
      id: string
      name?: string
      email?: string
    }
  }
}

export type MessageDirecao = 'entrada' | 'saida' | 'sistema'
export type MessageStatusEnvio = 'enviada' | 'entregue' | 'lida' | 'falha' | 'simulada'
export type TipoMensagem = 'mensagem' | 'nota_privada'

export interface ChannelMessage {
  id: string
  conversation: string
  direcao: MessageDirecao
  texto: string
  status_envio?: MessageStatusEnvio
  tipo_mensagem?: TipoMensagem
  midia_url?: string
  anexo?: string
  nome_anexo?: string
  message_id_externo?: string
  autor?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
  expand?: {
    autor?: {
      id: string
      name?: string
      email?: string
    }
  }
}

export interface MetaCredentialsStatus {
  whatsapp_ready: boolean
  instagram_ready: boolean
  webhook_verify_ready: boolean
  expected_secrets: Array<{
    name: string
    present: boolean
    description: string
  }>
  webhook_url: string
}
