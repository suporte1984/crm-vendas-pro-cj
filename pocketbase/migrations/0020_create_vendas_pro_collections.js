/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const contacts = app.findCollectionByNameOrId('contacts')
    const deals = app.findCollectionByNameOrId('deals')

    // Atualizar options do role em users para suportar 'gestor' e 'vendedor' além de 'admin' e 'member'
    const roleField = users.fields.getByName('role')
    if (roleField) {
      roleField.values = ['admin', 'gestor', 'vendedor', 'member']
      roleField.maxSelect = 1
      app.save(users)
    }

    // 1. PRODUCTS
    const products = new Collection({
      name: 'products',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'preco_base', type: 'number', required: false },
        { name: 'ativo', type: 'bool' },
        { name: 'comissao_percentual_padrao', type: 'number', required: false },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_nome ON products (nome)',
        'CREATE INDEX idx_products_ativo ON products (ativo)',
      ],
    })
    app.save(products)

    // 2. LEADS
    const leads = new Collection({
      name: 'leads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'empresa', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'telefone', type: 'text' },
        {
          name: 'origem',
          type: 'select',
          values: ['site', 'indicacao', 'anuncio', 'evento', 'outbound', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['novo', 'em_negociacao', 'convertido', 'perdido'],
          maxSelect: 1,
          required: true,
        },
        { name: 'valor_estimado', type: 'number' },
        {
          name: 'produto_interesse_id',
          type: 'relation',
          collectionId: products.id,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'responsavel_id',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'proxima_acao_em', type: 'date' },
        { name: 'motivo_perda', type: 'text' },
        { name: 'convertido_em', type: 'date' },
        {
          name: 'contato_id',
          type: 'relation',
          collectionId: contacts.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_status ON leads (status)',
        'CREATE INDEX idx_leads_responsavel ON leads (responsavel_id)',
        'CREATE INDEX idx_leads_created ON leads (created DESC)',
      ],
    })
    app.save(leads)

    // 3. SALES
    const sales = new Collection({
      name: 'sales',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero', type: 'text', required: true },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: contacts.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'deal_id',
          type: 'relation',
          collectionId: deals.id,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'produto_id',
          type: 'relation',
          collectionId: products.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'valor_bruto', type: 'number', required: true },
        { name: 'desconto', type: 'number' },
        { name: 'valor_liquido', type: 'number', required: true },
        { name: 'data_venda', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['em_negociacao', 'fechada', 'paga', 'cancelada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'comissao_percentual', type: 'number' },
        { name: 'comissao_valor', type: 'number' },
        {
          name: 'vendedor_id',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'forma_pagamento', type: 'text' },
        { name: 'parcelas', type: 'number' },
        { name: 'observacoes', type: 'text' },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_sales_numero ON sales (numero)',
        'CREATE INDEX idx_sales_cliente ON sales (cliente_id)',
        'CREATE INDEX idx_sales_vendedor ON sales (vendedor_id)',
        'CREATE INDEX idx_sales_status ON sales (status)',
        'CREATE INDEX idx_sales_data ON sales (data_venda DESC)',
      ],
    })
    app.save(sales)

    // 4. CONTRACTS
    const contracts = new Collection({
      name: 'contracts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero', type: 'text', required: true },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: contacts.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'produto_id',
          type: 'relation',
          collectionId: products.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date', required: true },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'valor_recorrente', type: 'number' },
        {
          name: 'periodicidade',
          type: 'select',
          values: ['mensal', 'trimestral', 'semestral', 'anual', 'único'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'ativo', 'suspenso', 'encerrado', 'cancelado'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'venda_id',
          type: 'relation',
          collectionId: sales.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'comissao_valor', type: 'number' },
        { name: 'comissao_percentual', type: 'number' },
        { name: 'observacoes', type: 'text' },
        { name: 'anexo_url', type: 'text' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_contracts_numero ON contracts (numero)',
        'CREATE INDEX idx_contracts_cliente ON contracts (cliente_id)',
        'CREATE INDEX idx_contracts_status ON contracts (status)',
        'CREATE INDEX idx_contracts_inicio ON contracts (data_inicio DESC)',
      ],
    })
    app.save(contracts)

    // Adicionar referência contrato_id em sales agora que contracts existe
    sales.fields.add(
      new RelationField({
        name: 'contrato_id',
        collectionId: contracts.id,
        maxSelect: 1,
        required: false,
      }),
    )
    sales.addIndex('idx_sales_contrato', false, 'contrato_id', '')
    app.save(sales)

    // 5. SALE_PAYMENTS
    const salePayments = new Collection({
      name: 'sale_payments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'sale_id',
          type: 'relation',
          collectionId: sales.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'numero_parcela', type: 'number', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'vencimento', type: 'date', required: true },
        { name: 'data_pagamento', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'pago', 'atrasado', 'cancelado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sale_payments_sale ON sale_payments (sale_id)',
        'CREATE INDEX idx_sale_payments_vencimento ON sale_payments (vencimento)',
        'CREATE INDEX idx_sale_payments_status ON sale_payments (status)',
      ],
    })
    app.save(salePayments)

    // 6. TASKS
    const tasks = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          values: ['ligacao', 'reuniao', 'email', 'follow_up', 'outro'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'prioridade',
          type: 'select',
          values: ['baixa', 'media', 'alta', 'urgente'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'vencimento', type: 'date' },
        {
          name: 'responsavel_id',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'entidade_tipo',
          type: 'select',
          values: ['lead', 'sale', 'contract', 'deal'],
          maxSelect: 1,
          required: false,
        },
        { name: 'entidade_id', type: 'text' },
        { name: 'concluida_em', type: 'date' },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tasks_status ON tasks (status)',
        'CREATE INDEX idx_tasks_responsavel ON tasks (responsavel_id)',
        'CREATE INDEX idx_tasks_vencimento ON tasks (vencimento)',
        'CREATE INDEX idx_tasks_entidade ON tasks (entidade_tipo, entidade_id)',
      ],
    })
    app.save(tasks)

    // 7. CAMPAIGN_SIMULATIONS (fundação para parte 2)
    const campaignSimulations = new Collection({
      name: 'campaign_simulations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_empresa', type: 'text', required: true },
        { name: 'campanha', type: 'text' },
        { name: 'mes_referencia', type: 'text' },
        { name: 'faturamento_atual', type: 'number' },
        { name: 'investimento_anuncios', type: 'number' },
        { name: 'impressoes', type: 'number' },
        { name: 'cliques', type: 'number' },
        { name: 'leads_gerados', type: 'number' },
        { name: 'vendas_geradas', type: 'number' },
        { name: 'meta_crescimento_percentual', type: 'number' },
        { name: 'metricas_calculadas', type: 'json' },
        { name: 'projecao', type: 'json' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_simulations_empresa ON campaign_simulations (nome_empresa)',
        'CREATE INDEX idx_simulations_created ON campaign_simulations (created DESC)',
      ],
    })
    app.save(campaignSimulations)

    // 8. AUDIT_LOGS (auditoria de alterações para contratos, vendas e leads)
    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'entidade_tipo',
          type: 'select',
          values: ['lead', 'sale', 'contract', 'deal', 'task'],
          maxSelect: 1,
          required: true,
        },
        { name: 'entidade_id', type: 'text', required: true },
        { name: 'acao', type: 'text', required: true },
        { name: 'campo', type: 'text' },
        { name: 'valor_anterior', type: 'text' },
        { name: 'valor_novo', type: 'text' },
        { name: 'detalhes', type: 'json' },
        {
          name: 'usuario_id',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_entidade ON audit_logs (entidade_tipo, entidade_id)',
        'CREATE INDEX idx_audit_created ON audit_logs (created DESC)',
      ],
    })
    app.save(auditLogs)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('audit_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('campaign_simulations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('tasks'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sale_payments'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('contracts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sales'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('leads'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('products'))
    } catch (_) {}
  },
)
