import pb from '@/lib/pocketbase/client'
import type {
  ChannelConnection,
  ChannelConversation,
  ChannelMessage,
  MetaCredentialsStatus,
} from '@/types/channels'

// --- Conexões de Canais ---

export async function listChannelConnections(
  includeArchived = false,
): Promise<ChannelConnection[]> {
  const filter = includeArchived ? '' : 'status != "arquivado"'
  return await pb.collection('channel_connections').getFullList<ChannelConnection>({
    filter,
    sort: '-created',
    expand: 'owner',
  })
}

export async function getChannelConnection(id: string): Promise<ChannelConnection> {
  return await pb.collection('channel_connections').getOne<ChannelConnection>(id, {
    expand: 'owner',
  })
}

export async function createChannelConnection(
  data: Partial<ChannelConnection>,
): Promise<ChannelConnection> {
  const user = pb.authStore.model
  const payload = {
    ...data,
    owner: user?.id,
  }
  return await pb.collection('channel_connections').create<ChannelConnection>(payload)
}

export async function updateChannelConnection(
  id: string,
  data: Partial<ChannelConnection>,
): Promise<ChannelConnection> {
  return await pb.collection('channel_connections').update<ChannelConnection>(id, data)
}

export async function archiveChannelConnection(id: string): Promise<ChannelConnection> {
  return await pb.collection('channel_connections').update<ChannelConnection>(id, {
    status: 'arquivado',
    conexao_status: 'desconectado',
  })
}

export async function deleteChannelConnection(id: string): Promise<boolean> {
  return await pb.collection('channel_connections').delete(id)
}

// --- Conversas ---

export async function listChannelConversations(options?: {
  connectionId?: string
  status?: string
}): Promise<ChannelConversation[]> {
  const filters: string[] = []
  if (options?.connectionId) {
    filters.push(`connection = "${options.connectionId}"`)
  }
  if (options?.status && options.status !== 'todas') {
    filters.push(`status = "${options.status}"`)
  }

  return await pb.collection('channel_conversations').getFullList<ChannelConversation>({
    filter: filters.length ? filters.join(' && ') : '',
    sort: '-updated',
    expand: 'connection,contact,responsavel',
  })
}

export async function getChannelConversation(id: string): Promise<ChannelConversation> {
  return await pb.collection('channel_conversations').getOne<ChannelConversation>(id, {
    expand: 'connection,contact,responsavel',
  })
}

export async function updateConversationStatus(
  id: string,
  status: ChannelConversation['status'],
): Promise<ChannelConversation> {
  return await pb.collection('channel_conversations').update<ChannelConversation>(id, {
    status,
  })
}

export async function markConversationAsRead(id: string): Promise<ChannelConversation> {
  return await pb.collection('channel_conversations').update<ChannelConversation>(id, {
    nao_lidas: 0,
  })
}

// --- Mensagens ---

export async function listChannelMessages(conversationId: string): Promise<ChannelMessage[]> {
  return await pb.collection('channel_messages').getFullList<ChannelMessage>({
    filter: `conversation = "${conversationId}"`,
    sort: '+created',
    expand: 'autor',
  })
}

export interface SendMessageResult {
  success: boolean
  message_id: string
  status_envio: string
  is_simulated: boolean
  info: string
}

export async function sendChannelMessage(
  conversationId: string,
  texto: string,
): Promise<SendMessageResult> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token

  const res = await fetch(`${baseUrl}/backend/v1/channels/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      texto,
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Erro HTTP ${res.status} ao enviar mensagem.`)
  }

  return (await res.json()) as SendMessageResult
}

// --- Status de Credenciais da Meta ---

export async function getMetaCredentialsStatus(): Promise<MetaCredentialsStatus> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token

  const res = await fetch(`${baseUrl}/backend/v1/channels/meta/status`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!res.ok) {
    throw new Error(`Erro ao verificar status da Meta: HTTP ${res.status}`)
  }

  return (await res.json()) as MetaCredentialsStatus
}

// --- Criar conversa manual ou simular mensagem recebida (para testes do usuário) ---

export async function createManualConversation(params: {
  connectionId: string
  clienteNome: string
  clienteIdentificador: string
  mensagemInicial: string
}): Promise<ChannelConversation> {
  const user = pb.authStore.model

  // 1. Criar ou encontrar contato
  let contactId = ''
  try {
    const clean = params.clienteIdentificador.replace(/\D/g, '')
    const list = await pb.collection('contacts').getList(1, 1, {
      filter: `phone ~ "${clean}"`,
    })
    if (list.items.length > 0) {
      contactId = list.items[0].id
    }
  } catch {
    /* intentionally ignored */
  }

  if (!contactId) {
    try {
      const createdContact = await pb.collection('contacts').create({
        name: params.clienteNome,
        phone: params.clienteIdentificador,
        status: 'lead',
        notes: 'Contato criado para atendimento via canal.',
        owner: user?.id,
      })
      contactId = createdContact.id
    } catch {
      /* intentionally ignored */
    }
  }

  // 2. Criar conversa
  const conv = await pb.collection('channel_conversations').create<ChannelConversation>({
    connection: params.connectionId,
    contact: contactId || undefined,
    cliente_nome: params.clienteNome,
    cliente_identificador: params.clienteIdentificador,
    ultima_mensagem: params.mensagemInicial,
    ultima_mensagem_em: new Date().toISOString(),
    nao_lidas: 1,
    status: 'aberta',
    responsavel: user?.id,
  })

  // 3. Criar mensagem de entrada
  await pb.collection('channel_messages').create({
    conversation: conv.id,
    direcao: 'entrada',
    texto: params.mensagemInicial,
    status_envio: 'entregue',
  })

  return conv
}
