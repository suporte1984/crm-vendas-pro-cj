import pb from '@/lib/pocketbase/client'
import type { Sale, SalePayment } from '@/types/vendasPro'
import {
  calculateCommissionValue,
  calculateNetValue,
  determineSaleStatusFromPayments,
  generateInstallments,
} from '@/lib/vendasProCalculations'
import { logAudit } from './audit'

export async function listSales(filter = '') {
  return pb.collection<Sale>('sales').getFullList({
    filter: filter || undefined,
    sort: '-data_venda,-created',
    expand: 'cliente_id,contrato_id,deal_id,produto_id,vendedor_id,owner',
  })
}

export async function getSale(id: string) {
  return pb.collection<Sale>('sales').getOne(id, {
    expand: 'cliente_id,contrato_id,deal_id,produto_id,vendedor_id,owner',
  })
}

export async function listSalePayments(saleId: string) {
  return pb.collection<SalePayment>('sale_payments').getFullList({
    filter: `sale_id = "${saleId}"`,
    sort: '+numero_parcela,+vencimento',
  })
}

export async function createSaleWithPayments(data: {
  cliente_id: string
  produto_id?: string
  contrato_id?: string
  deal_id?: string
  valor_bruto: number
  desconto?: number
  comissao_percentual?: number
  data_venda: string
  vendedor_id?: string
  forma_pagamento?: string
  parcelas?: number
  observacoes?: string
}) {
  const year = new Date().getFullYear()
  const random = Math.floor(100 + Math.random() * 900)
  const numero = `VND-${year}-${random}`

  const valor_liquido = calculateNetValue(data.valor_bruto, data.desconto || 0)
  const comissao_valor = calculateCommissionValue(valor_liquido, data.comissao_percentual || 0)
  const parcelasCount = Math.max(1, data.parcelas || 1)

  const sale = await pb.collection<Sale>('sales').create(
    {
      numero,
      cliente_id: data.cliente_id,
      produto_id: data.produto_id || undefined,
      contrato_id: data.contrato_id || undefined,
      deal_id: data.deal_id || undefined,
      valor_bruto: data.valor_bruto,
      desconto: data.desconto || 0,
      valor_liquido,
      data_venda: data.data_venda,
      status: 'fechada',
      comissao_percentual: data.comissao_percentual || 0,
      comissao_valor,
      vendedor_id: data.vendedor_id || pb.authStore.record?.id,
      forma_pagamento: data.forma_pagamento || 'Boleto Bancário',
      parcelas: parcelasCount,
      observacoes: data.observacoes || '',
      owner: pb.authStore.record?.id,
    },
    { expand: 'cliente_id,contrato_id,deal_id,produto_id,vendedor_id,owner' },
  )

  // Gerar automaticamente as parcelas sale_payment com vencimentos mensais
  const installmentPlan = generateInstallments(valor_liquido, parcelasCount, data.data_venda)
  const payments: SalePayment[] = []

  for (const item of installmentPlan) {
    const payment = await pb.collection<SalePayment>('sale_payments').create({
      sale_id: sale.id,
      numero_parcela: item.numero_parcela,
      valor: item.valor,
      vencimento: item.vencimento,
      status: 'pendente',
    })
    payments.push(payment)
  }

  // Se a venda tem contrato vinculado, atualizar o contrato com a venda_id
  if (data.contrato_id) {
    try {
      await pb.collection('contracts').update(data.contrato_id, {
        venda_id: sale.id,
      })
    } catch {
      /* intentionally ignored */
    }
  }

  await logAudit({
    entidade_tipo: 'sale',
    entidade_id: sale.id,
    acao: 'criacao',
    valor_novo: sale.status,
    detalhes: {
      numero: sale.numero,
      valor_liquido: sale.valor_liquido,
      parcelas: parcelasCount,
    },
  })

  return { sale, payments }
}

export async function updateSale(id: string, data: Partial<Sale>, previousSale?: Sale) {
  const updated = await pb.collection<Sale>('sales').update(id, data, {
    expand: 'cliente_id,contrato_id,deal_id,produto_id,vendedor_id,owner',
  })

  if (previousSale && data.status && previousSale.status !== data.status) {
    await logAudit({
      entidade_tipo: 'sale',
      entidade_id: id,
      acao: 'mudanca_status',
      campo: 'status',
      valor_anterior: previousSale.status,
      valor_novo: data.status,
    })
  }

  return updated
}

export async function markPaymentAsPaid(paymentId: string, paidDate = new Date().toISOString()) {
  const updatedPayment = await pb.collection<SalePayment>('sale_payments').update(paymentId, {
    status: 'pago',
    data_pagamento: paidDate,
  })

  // Verificar se todas as parcelas da venda agora estão pagas
  const allPayments = await listSalePayments(updatedPayment.sale_id)
  const sale = await getSale(updatedPayment.sale_id)

  const newSaleStatus = determineSaleStatusFromPayments(
    sale.status,
    allPayments.map((p) => p.status),
  )

  let updatedSale = sale
  if (newSaleStatus !== sale.status) {
    updatedSale = await updateSale(sale.id, { status: newSaleStatus }, sale)
  }

  await logAudit({
    entidade_tipo: 'sale',
    entidade_id: sale.id,
    acao: 'pagamento_parcela',
    detalhes: {
      numero_parcela: updatedPayment.numero_parcela,
      valor: updatedPayment.valor,
      novo_status_venda: updatedSale.status,
    },
  })

  return { payment: updatedPayment, sale: updatedSale }
}

export async function deleteSale(id: string) {
  await logAudit({
    entidade_tipo: 'sale',
    entidade_id: id,
    acao: 'exclusao',
  })
  return pb.collection('sales').delete(id)
}
