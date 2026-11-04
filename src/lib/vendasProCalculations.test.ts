import { describe, expect, it } from 'vitest'
import {
  calculateCommissionValue,
  calculateNetValue,
  determineSaleStatusFromPayments,
  generateInstallments,
} from './vendasProCalculations'

describe('Vendas PRO - Funções de Cálculo Financeiro', () => {
  it('calcula valor líquido corretamente com desconto', () => {
    expect(calculateNetValue(1000, 150)).toBe(850)
    expect(calculateNetValue(1000, 0)).toBe(1000)
    expect(calculateNetValue(1000, 1200)).toBe(0) // Não fica negativo
  })

  it('calcula comissão proporcional ao valor líquido', () => {
    expect(calculateCommissionValue(1000, 10)).toBe(100)
    expect(calculateCommissionValue(850, 12)).toBe(102)
    expect(calculateCommissionValue(1234.56, 15)).toBe(185.18)
    expect(calculateCommissionValue(1000, 0)).toBe(0)
    // Caso de uso das especificações do usuário: R$ 35.000 a 5% = R$ 1.750,00
    expect(calculateCommissionValue(35000, 5)).toBe(1750)
  })

  it('gera parcelamento com soma exata ajustando centavos na última parcela', () => {
    const installments = generateInstallments(100, 3, '2026-11-01T00:00:00.000Z')
    expect(installments).toHaveLength(3)
    expect(installments[0].numero_parcela).toBe(1)
    expect(installments[0].valor).toBe(33.33)
    expect(installments[1].valor).toBe(33.33)
    expect(installments[2].valor).toBe(33.34) // Centavo ajustado

    const sum = installments.reduce((acc, curr) => acc + curr.valor, 0)
    expect(Math.round(sum * 100) / 100).toBe(100)
  })

  it('gera parcelamento único para 1 parcela', () => {
    const installments = generateInstallments(1500, 1, '2026-11-01T00:00:00.000Z')
    expect(installments).toHaveLength(1)
    expect(installments[0].valor).toBe(1500)
  })

  it('atualiza status da venda para paga automaticamente quando todas as parcelas estão pagas', () => {
    expect(determineSaleStatusFromPayments('fechada', ['pago', 'pago', 'pago'])).toBe('paga')
    expect(determineSaleStatusFromPayments('fechada', ['pago', 'pendente', 'pago'])).toBe('fechada')
    expect(determineSaleStatusFromPayments('paga', ['pago', 'atrasado'])).toBe('fechada')
    expect(determineSaleStatusFromPayments('cancelada', ['pago', 'pago'])).toBe('cancelada')
  })
})
