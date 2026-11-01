/**
 * Regras e cálculos financeiros puros do Vendas PRO
 * Reutilizáveis no frontend, backend e testáveis isoladamente.
 */

export interface InstallmentPlan {
  numero_parcela: number
  valor: number
  vencimento: string // ISO string
}

/**
 * Calcula o valor líquido da venda subtraindo o desconto do valor bruto.
 */
export function calculateNetValue(grossValue: number, discount = 0): number {
  const gross = Number(grossValue) || 0
  const disc = Math.max(0, Number(discount) || 0)
  return Math.max(0, Math.round((gross - disc) * 100) / 100)
}

/**
 * Calcula o valor da comissão a partir do valor líquido e percentual de comissão.
 */
export function calculateCommissionValue(netValue: number, commissionPercent = 0): number {
  const net = Math.max(0, Number(netValue) || 0)
  const percent = Math.max(0, Math.min(100, Number(commissionPercent) || 0))
  return Math.round(net * (percent / 100) * 100) / 100
}

/**
 * Gera o plano de parcelas mensais a partir da data base da venda.
 * Garante que a soma das parcelas seja exatamente igual ao valor líquido (ajustando centavos na última parcela).
 */
export function generateInstallments(
  totalValue: number,
  installmentCount: number,
  baseDate: string | Date = new Date(),
): InstallmentPlan[] {
  const count = Math.max(1, Math.floor(Number(installmentCount) || 1))
  const total = Math.max(0, Number(totalValue) || 0)

  if (count === 1) {
    const d = new Date(baseDate)
    return [
      {
        numero_parcela: 1,
        valor: total,
        vencimento: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
      },
    ]
  }

  const baseAmount = Math.floor((total / count) * 100) / 100
  const plan: InstallmentPlan[] = []
  let accumulated = 0

  const initialDate = new Date(baseDate)
  const validBaseDate = isNaN(initialDate.getTime()) ? new Date() : initialDate

  for (let i = 1; i <= count; i++) {
    const isLast = i === count
    const installmentValue = isLast ? Math.round((total - accumulated) * 100) / 100 : baseAmount

    accumulated += installmentValue

    // Incrementar i - 1 meses
    const dueDate = new Date(validBaseDate)
    dueDate.setMonth(dueDate.getMonth() + (i - 1))

    plan.push({
      numero_parcela: i,
      valor: installmentValue,
      vencimento: dueDate.toISOString(),
    })
  }

  return plan
}

/**
 * Determina o novo status da venda com base nas parcelas pagas.
 * Se todas as parcelas estiverem com status 'pago', retorna 'paga'.
 * Caso contrário, se o status anterior era 'paga' e foi desmarcada, volta para 'fechada'.
 */
export function determineSaleStatusFromPayments(
  currentStatus: 'em_negociacao' | 'fechada' | 'paga' | 'cancelada',
  paymentStatuses: ('pendente' | 'pago' | 'atrasado' | 'cancelado')[],
): 'em_negociacao' | 'fechada' | 'paga' | 'cancelada' {
  if (currentStatus === 'cancelada') return 'cancelada'
  if (paymentStatuses.length === 0) return currentStatus

  const allPaid = paymentStatuses.every((status) => status === 'pago')
  if (allPaid) {
    return 'paga'
  }

  // Se antes estava 'paga' e não está mais tudo pago, reverte para 'fechada'
  if (currentStatus === 'paga') {
    return 'fechada'
  }

  return currentStatus
}
