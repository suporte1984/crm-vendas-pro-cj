/**
 * Agregações do módulo Vendas PRO, reutilizadas pelas páginas Resultados, Comissões e Dashboard.
 * Todos os cálculos são puros, para poderem ser testados isoladamente.
 */
import type { Contract, Sale, SalePayment } from '@/types/vendasPro'

export interface SalesMetrics {
  faturamentoBruto: number
  faturamentoLiquido: number
  descontos: number
  ticketMedio: number
  qtdVendas: number
  qtdPagas: number
  qtdCanceladas: number
  comissaoTotal: number
  investimentoAnuncios: number
  roas: number | null
}

export function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + (Number(pick(item)) || 0), 0)
}

/** Filtra vendas dentro de um intervalo de datas (inclusive, por data_venda). */
export function filterSalesByPeriod(sales: Sale[], startISO: string, endISO: string): Sale[] {
  const start = startISO.slice(0, 10)
  const end = endISO.slice(0, 10)
  return sales.filter((s) => {
    const d = (s.data_venda || '').slice(0, 10)
    if (!d) return false
    return d >= start && d <= end
  })
}

/** Filtra contratos por data de início (inclusive). */
export function filterContractsByPeriod(
  contracts: Contract[],
  startISO: string,
  endISO: string,
): Contract[] {
  const start = startISO.slice(0, 10)
  const end = endISO.slice(0, 10)
  return contracts.filter((c) => {
    const d = (c.data_inicio || '').slice(0, 10)
    if (!d) return false
    return d >= start && d <= end
  })
}

/** KPIs de resultados a partir de vendas e contratos do período. */
export function computeSalesMetrics(
  sales: Sale[],
  contracts: Contract[],
  investimentoAnuncios = 0,
): SalesMetrics {
  const qtdVendas = sales.length
  const faturamentoBruto = sumBy(sales, (s) => s.valor_bruto || 0)
  const descontos = sumBy(sales, (s) => s.desconto || 0)
  const faturamentoLiquido = sumBy(sales, (s) => s.valor_liquido || 0)
  const comissaoTotal = sumBy(sales, (s) => s.comissao_valor || 0)

  const ticketMedio = qtdVendas > 0 ? Math.round((faturamentoLiquido / qtdVendas) * 100) / 100 : 0

  // ROAS = retorno em vendas / investimento em anúncios (apenas quando há investimento registrado)
  const investimento = Number(investimentoAnuncios) || 0
  const roas = investimento > 0 ? Math.round((faturamentoLiquido / investimento) * 100) / 100 : null

  return {
    faturamentoBruto,
    faturamentoLiquido,
    descontos,
    ticketMedio,
    qtdVendas,
    qtdPagas: sales.filter((s) => s.status === 'paga').length,
    qtdCanceladas: sales.filter((s) => s.status === 'cancelada').length,
    comissaoTotal,
    investimentoAnuncios: investimento,
    roas,
  }
}

/** Comissão total de uma venda + contrato vinculado (a comissão do contrato entra como adicional). */
export function computeSaleCommission(sale: Sale, contract?: Contract): number {
  const base = Math.max(0, Number(sale.comissao_valor) || 0)
  const extra = contract ? Math.max(0, Number(contract.comissao_valor) || 0) : 0
  return Math.round((base + extra) * 100) / 100
}

/** Agrupa vendas por mês (YYYY-MM). */
export function groupSalesByMonth(sales: Sale[]): Map<string, Sale[]> {
  const map = new Map<string, Sale[]>()
  for (const sale of sales) {
    const key = (sale.data_venda || '').slice(0, 7) || 'sem-data'
    const list = map.get(key) || []
    list.push(sale)
    map.set(key, list)
  }
  return map
}

/** Receita reconhecida: soma das parcelas pagas (caixa) em um período. */
export function computeCashflowByMonth(payments: SalePayment[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const p of payments) {
    const key = (p.vencimento || '').slice(0, 7) || 'sem-data'
    if (p.status !== 'pago') continue
    map.set(key, (map.get(key) || 0) + (Number(p.valor) || 0))
  }
  return map
}

/** Valor total de parcelas em atraso. */
export function computeOverdue(
  payments: SalePayment[],
  todayISO = new Date().toISOString(),
): number {
  const today = todayISO.slice(0, 10)
  return payments
    .filter((p) => {
      if (p.status === 'pago' || p.status === 'cancelado') return false
      return (p.vencimento || '').slice(0, 10) < today
    })
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
}
