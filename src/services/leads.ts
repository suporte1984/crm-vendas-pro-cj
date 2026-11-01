import pb from '@/lib/pocketbase/client'
import type { Lead, Product } from '@/types/vendasPro'
import { logAudit } from './audit'

export async function listProducts() {
  return pb.collection<Product>('products').getFullList({
    sort: 'nome',
  })
}

export async function createProduct(data: Partial<Product>) {
  return pb.collection<Product>('products').create({
    owner: pb.authStore.record?.id,
    ativo: true,
    ...data,
  })
}

export async function listLeads(filter = '') {
  return pb.collection<Lead>('leads').getFullList({
    filter: filter || undefined,
    sort: '-created',
    expand: 'produto_interesse_id,responsavel_id,contato_id,owner',
  })
}

export async function createLead(data: Partial<Lead>) {
  const record = await pb.collection<Lead>('leads').create(
    {
      owner: pb.authStore.record?.id,
      responsavel_id: data.responsavel_id || pb.authStore.record?.id,
      status: 'novo',
      origem: 'site',
      ...data,
    },
    { expand: 'produto_interesse_id,responsavel_id,contato_id,owner' },
  )

  await logAudit({
    entidade_tipo: 'lead',
    entidade_id: record.id,
    acao: 'criacao',
    valor_novo: record.status,
    detalhes: { nome: record.nome, valor_estimado: record.valor_estimado },
  })

  return record
}

export async function updateLead(id: string, data: Partial<Lead>, previousLead?: Lead) {
  const updated = await pb.collection<Lead>('leads').update(id, data, {
    expand: 'produto_interesse_id,responsavel_id,contato_id,owner',
  })

  if (previousLead && data.status && previousLead.status !== data.status) {
    await logAudit({
      entidade_tipo: 'lead',
      entidade_id: id,
      acao: 'mudanca_status',
      campo: 'status',
      valor_anterior: previousLead.status,
      valor_novo: data.status,
    })
  }

  return updated
}

export async function deleteLead(id: string) {
  await logAudit({
    entidade_tipo: 'lead',
    entidade_id: id,
    acao: 'exclusao',
  })
  return pb.collection('leads').delete(id)
}

/**
 * Converte um Lead em Contato e Negócio (Deal) no pipeline do CRM.
 * Não duplica contatos se já existir contato vinculado ou com mesmo email.
 */
export async function convertLeadToContactAndDeal(lead: Lead) {
  let contactId = lead.contato_id

  if (!contactId && lead.email) {
    try {
      const existing = await pb.collection('contacts').getFirstListItem(`email = "${lead.email}"`)
      contactId = existing.id
    } catch {
      /* intentionally ignored */
    }
  }

  if (!contactId) {
    const newContact = await pb.collection('contacts').create({
      name: lead.nome,
      email: lead.email || '',
      phone: lead.telefone || '',
      company: lead.empresa || '',
      status: 'lead',
      owner: lead.responsavel_id || pb.authStore.record?.id,
    })
    contactId = newContact.id
  }

  // Obter primeiro estágio do pipeline
  let stageId = ''
  try {
    const firstStage = await pb
      .collection('pipeline_stages')
      .getFirstListItem('', { sort: '+order' })
    stageId = firstStage.id
  } catch {
    /* intentionally ignored */
  }

  // Criar Deal
  const dealCode = `D-${Math.floor(1000 + Math.random() * 9000)}`
  const newDeal = await pb.collection('deals').create({
    code: dealCode,
    title: `${lead.empresa || lead.nome} - Oportunidade Vendas PRO`,
    value: lead.valor_estimado || 0,
    stage: stageId || undefined,
    status: 'aberto',
    contact: contactId,
    owner: lead.responsavel_id || pb.authStore.record?.id,
    expected_close: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    position: 0,
    temperature: 'quente',
  })

  // Atualizar Lead como convertido
  const now = new Date().toISOString()
  const updatedLead = await pb.collection<Lead>('leads').update(
    lead.id,
    {
      status: 'convertido',
      convertido_em: now,
      contato_id: contactId,
    },
    { expand: 'produto_interesse_id,responsavel_id,contato_id,owner' },
  )

  await logAudit({
    entidade_tipo: 'lead',
    entidade_id: lead.id,
    acao: 'conversao',
    valor_anterior: lead.status,
    valor_novo: 'convertido',
    detalhes: { contactId, dealId: newDeal.id, dealCode },
  })

  return { lead: updatedLead, contactId, deal: newDeal }
}

export async function markLeadAsLost(lead: Lead, motivo_perda: string) {
  const updated = await pb.collection<Lead>('leads').update(
    lead.id,
    {
      status: 'perdido',
      motivo_perda,
    },
    { expand: 'produto_interesse_id,responsavel_id,contato_id,owner' },
  )

  await logAudit({
    entidade_tipo: 'lead',
    entidade_id: lead.id,
    acao: 'perda',
    valor_anterior: lead.status,
    valor_novo: 'perdido',
    detalhes: { motivo_perda },
  })

  return updated
}
