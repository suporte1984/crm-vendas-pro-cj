import pb from '@/lib/pocketbase/client'
import type { Contract, Lead } from '@/types/vendasPro'
import { logAudit } from './audit'

export async function listContracts(params?: {
  filter?: string
  sort?: string
  page?: number
  perPage?: number
}) {
  const page = params?.page || 1
  const perPage = params?.perPage || 20
  const sort = params?.sort || '-created'

  return pb.collection<Contract>('contracts').getList(page, perPage, {
    filter: params?.filter || undefined,
    sort,
    expand: 'cliente_id,produto_id,venda_id,criado_por,owner',
  })
}

export async function getAllContracts(filter = '') {
  return pb.collection<Contract>('contracts').getFullList({
    filter: filter || undefined,
    sort: '-created',
    expand: 'cliente_id,produto_id,venda_id,criado_por,owner',
  })
}

export async function createContract(data: Partial<Contract>) {
  // Gerar número sequencial se não enviado
  let numero = data.numero
  if (!numero) {
    const year = new Date().getFullYear()
    const random = Math.floor(100 + Math.random() * 900)
    numero = `CTR-${year}-${random}`
  }

  const record = await pb.collection<Contract>('contracts').create(
    {
      owner: pb.authStore.record?.id,
      criado_por: pb.authStore.record?.id,
      status: 'ativo',
      periodicidade: 'mensal',
      ...data,
      numero,
    },
    { expand: 'cliente_id,produto_id,venda_id,criado_por,owner' },
  )

  await logAudit({
    entidade_tipo: 'contract',
    entidade_id: record.id,
    acao: 'criacao',
    valor_novo: record.status,
    detalhes: { numero: record.numero, valor_total: record.valor_total },
  })

  return record
}

export async function updateContract(
  id: string,
  data: Partial<Contract>,
  previousContract?: Contract,
) {
  const updated = await pb.collection<Contract>('contracts').update(id, data, {
    expand: 'cliente_id,produto_id,venda_id,criado_por,owner',
  })

  if (previousContract && data.status && previousContract.status !== data.status) {
    await logAudit({
      entidade_tipo: 'contract',
      entidade_id: id,
      acao: 'mudanca_status',
      campo: 'status',
      valor_anterior: previousContract.status,
      valor_novo: data.status,
      detalhes: {
        venda_id: previousContract.venda_id,
        comissao_valor: previousContract.comissao_valor,
      },
    })
  }

  return updated
}

export async function duplicateContract(contract: Contract) {
  const year = new Date().getFullYear()
  const random = Math.floor(100 + Math.random() * 900)
  const novoNumero = `CTR-${year}-${random}`

  return createContract({
    numero: novoNumero,
    cliente_id: contract.cliente_id,
    produto_id: contract.produto_id,
    data_inicio: new Date().toISOString(),
    data_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    valor_total: contract.valor_total,
    valor_recorrente: contract.valor_recorrente,
    periodicidade: contract.periodicidade,
    status: 'rascunho',
    comissao_percentual: contract.comissao_percentual,
    comissao_valor: contract.comissao_valor,
    observacoes: `Cópia do contrato ${contract.numero}`,
  })
}

export async function deleteContract(id: string) {
  await logAudit({
    entidade_tipo: 'contract',
    entidade_id: id,
    acao: 'exclusao',
  })
  return pb.collection('contracts').delete(id)
}

/**
 * Retorna os leads convertidos que ainda não possuem um contrato associado ao seu contato.
 */
export async function getConvertedLeadsWithoutContract(): Promise<Lead[]> {
  // 1. Obter todos os contratos para mapear cliente_id
  const contracts = await pb.collection<Contract>('contracts').getFullList({
    fields: 'cliente_id',
  })
  const clientIdsWithContract = new Set(contracts.map((c) => c.cliente_id).filter(Boolean))

  // 2. Obter leads com status = 'convertido'
  const convertedLeads = await pb.collection<Lead>('leads').getFullList({
    filter: 'status = "convertido"',
    sort: '-created',
    expand: 'produto_interesse_id,contato_id,responsavel_id',
  })

  // 3. Filtrar leads cujo contato ainda não tem contrato
  return convertedLeads.filter((l) => {
    if (!l.contato_id) return true
    return !clientIdsWithContract.has(l.contato_id)
  })
}

/**
 * Cria contratos a partir de leads convertidos selecionados em lote.
 */
export async function migrateLeadsToContracts(
  leads: Lead[],
  commonParams: {
    periodicidade: Contract['periodicidade']
    data_inicio: string
    data_fim: string
  },
) {
  const created: Contract[] = []
  const year = new Date().getFullYear()

  for (const lead of leads) {
    if (!lead.contato_id) continue

    const random = Math.floor(100 + Math.random() * 900)
    const numero = `CTR-${year}-${random}`
    const valor = lead.valor_estimado || 1000

    const contract = await createContract({
      numero,
      cliente_id: lead.contato_id,
      produto_id: lead.produto_interesse_id || undefined,
      data_inicio: commonParams.data_inicio,
      data_fim: commonParams.data_fim,
      valor_total: valor,
      valor_recorrente: valor,
      periodicidade: commonParams.periodicidade,
      status: 'ativo',
      observacoes: `Gerado automaticamente da conversão do Lead: ${lead.nome} (${lead.empresa || ''})`,
    })

    created.push(contract)
  }

  return created
}
