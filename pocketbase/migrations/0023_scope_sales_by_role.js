/// <reference path="../pb_data/types.d.ts" />
// Escopo de vendas e contratos por usuário:
// - vendedor: vê apenas os próprios registros (vendedor_id / criado_por)
// - gestor / admin: vê de todo o time
migrate(
  (app) => {
    const isManager = "(@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    const writeOwn =
      "@request.auth.id != '' && (vendedor_id = @request.auth.id || " + isManager + ')'

    const sales = app.findCollectionByNameOrId('sales')
    sales.listRule = writeOwn
    sales.viewRule = writeOwn
    sales.createRule = "@request.auth.id != ''"
    sales.updateRule = writeOwn
    sales.deleteRule = writeOwn
    app.save(sales)

    const contracts = app.findCollectionByNameOrId('contracts')
    const contractsRead =
      "@request.auth.id != '' && (criado_por = @request.auth.id || " + isManager + ')'
    contracts.listRule = contractsRead
    contracts.viewRule = contractsRead
    contracts.createRule = "@request.auth.id != ''"
    contracts.updateRule = contractsRead
    contracts.deleteRule = contractsRead
    app.save(contracts)

    const payments = app.findCollectionByNameOrId('sale_payments')
    payments.listRule =
      "@request.auth.id != '' && sale_id.vendedor_id = @request.auth.id || " + isManager
    payments.viewRule = payments.listRule
    payments.createRule = "@request.auth.id != ''"
    payments.updateRule = payments.listRule
    payments.deleteRule = payments.listRule
    app.save(payments)
  },
  (app) => {
    const open = "@request.auth.id != ''"
    const sales = app.findCollectionByNameOrId('sales')
    sales.listRule = open
    sales.viewRule = open
    sales.createRule = open
    sales.updateRule = open
    sales.deleteRule = open
    app.save(sales)

    const contracts = app.findCollectionByNameOrId('contracts')
    contracts.listRule = open
    contracts.viewRule = open
    contracts.createRule = open
    contracts.updateRule = open
    contracts.deleteRule = open
    app.save(contracts)

    const payments = app.findCollectionByNameOrId('sale_payments')
    payments.listRule = open
    payments.viewRule = open
    payments.createRule = open
    payments.updateRule = open
    payments.deleteRule = open
    app.save(payments)
  },
)
