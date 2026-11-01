import type { RecordModel } from 'pocketbase'
import type { Contact, Deal, UserRecord } from '@/types/crm'

export interface Product extends RecordModel {
  nome: string
  descricao?: string
  preco_base?: number
  ativo: boolean
  comissao_percentual_padrao?: number
  owner?: string
}

export type LeadOrigem = 'site' | 'indicacao' | 'anuncio' | 'evento' | 'outbound' | 'outro'
export type LeadStatus = 'novo' | 'em_negociacao' | 'convertido' | 'perdido'

export interface Lead extends RecordModel {
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  origem?: LeadOrigem
  status: LeadStatus
  valor_estimado?: number
  produto_interesse_id?: string
  responsavel_id?: string
  proxima_acao_em?: string
  motivo_perda?: string
  convertido_em?: string
  contato_id?: string
  owner?: string
  expand?: {
    produto_interesse_id?: Product
    responsavel_id?: UserRecord
    contato_id?: Contact
    owner?: UserRecord
  }
}

export type ContractPeriodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'único'
export type ContractStatus = 'rascunho' | 'ativo' | 'suspenso' | 'encerrado' | 'cancelado'

export interface Contract extends RecordModel {
  numero: string
  cliente_id: string
  produto_id?: string
  data_inicio: string
  data_fim: string
  valor_total: number
  valor_recorrente?: number
  periodicidade: ContractPeriodicidade
  status: ContractStatus
  venda_id?: string
  comissao_valor?: number
  comissao_percentual?: number
  observacoes?: string
  anexo_url?: string
  criado_por?: string
  owner?: string
  expand?: {
    cliente_id?: Contact
    produto_id?: Product
    venda_id?: Sale
    criado_por?: UserRecord
    owner?: UserRecord
  }
}

export type SaleStatus = 'em_negociacao' | 'fechada' | 'paga' | 'cancelada'

export interface Sale extends RecordModel {
  numero: string
  cliente_id: string
  contrato_id?: string
  deal_id?: string
  produto_id?: string
  valor_bruto: number
  desconto?: number
  valor_liquido: number
  data_venda: string
  status: SaleStatus
  comissao_percentual?: number
  comissao_valor?: number
  vendedor_id?: string
  forma_pagamento?: string
  parcelas?: number
  observacoes?: string
  owner?: string
  expand?: {
    cliente_id?: Contact
    contrato_id?: Contract
    deal_id?: Deal
    produto_id?: Product
    vendedor_id?: UserRecord
    owner?: UserRecord
  }
}

export type SalePaymentStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado'

export interface SalePayment extends RecordModel {
  sale_id: string
  numero_parcela: number
  valor: number
  vencimento: string
  data_pagamento?: string
  status: SalePaymentStatus
}

export type TaskTipo = 'ligacao' | 'reuniao' | 'email' | 'follow_up' | 'outro'
export type TaskPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
export type TaskEntidadeTipo = 'lead' | 'sale' | 'contract' | 'deal'

export interface TaskItem extends RecordModel {
  titulo: string
  descricao?: string
  tipo: TaskTipo
  prioridade: TaskPrioridade
  status: TaskStatus
  vencimento?: string
  responsavel_id?: string
  entidade_tipo?: TaskEntidadeTipo
  entidade_id?: string
  concluida_em?: string
  owner?: string
  expand?: {
    responsavel_id?: UserRecord
    owner?: UserRecord
  }
}

export interface CampaignSimulation extends RecordModel {
  nome_empresa: string
  campanha?: string
  mes_referencia?: string
  faturamento_atual?: number
  investimento_anuncios?: number
  impressoes?: number
  cliques?: number
  leads_gerados?: number
  vendas_geradas?: number
  meta_crescimento_percentual?: number
  metricas_calculadas?: Record<string, unknown>
  projecao?: Record<string, unknown>
  criado_por?: string
  owner?: string
}

export interface AuditLog extends RecordModel {
  entidade_tipo: 'lead' | 'sale' | 'contract' | 'deal' | 'task'
  entidade_id: string
  acao: string
  campo?: string
  valor_anterior?: string
  valor_novo?: string
  detalhes?: Record<string, unknown>
  usuario_id?: string
  expand?: {
    usuario_id?: UserRecord
  }
}
