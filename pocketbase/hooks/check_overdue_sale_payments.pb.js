// Cron diário para atualizar parcelas vencidas para 'atrasado'
cronAdd('check_overdue_sale_payments', '0 3 * * *', () => {
  const nowIso = new Date().toISOString()
  try {
    // Buscar parcelas pendentes com vencimento anterior a hoje
    const overduePayments = $app.findRecordsByFilter(
      'sale_payments',
      `status = 'pendente' && vencimento < '${nowIso}'`,
      '+vencimento',
      500,
      0,
    )

    let updatedCount = 0
    for (const payment of overduePayments) {
      payment.set('status', 'atrasado')
      $app.save(payment)
      updatedCount++
    }

    if (updatedCount > 0) {
      console.log(
        `[Cron] check_overdue_sale_payments: ${updatedCount} parcelas marcadas como atrasadas.`,
      )
    }
  } catch (err) {
    console.error('[Cron] Erro ao verificar parcelas atrasadas:', err)
  }
})
