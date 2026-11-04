migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const contacts = app.findCollectionByNameOrId('contacts')

    // 1. channel_connections
    const connections = new Collection({
      name: 'channel_connections',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['whatsapp', 'whatsapp_cloud', 'instagram'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'arquivado'],
          maxSelect: 1,
        },
        {
          name: 'conexao_status',
          type: 'select',
          required: true,
          values: ['conectado', 'desconectado', 'aguardando_credenciais'],
          maxSelect: 1,
        },
        { name: 'numero_conectado', type: 'text' },
        { name: 'identificador_externo', type: 'text' }, // phone_number_id ou instagram_account_id
        { name: 'equipe_padrao', type: 'text' },
        { name: 'funil_padrao', type: 'text' },
        { name: 'estagio_abrir_chat', type: 'text' },
        { name: 'estagio_fechar_chat', type: 'text' },
        {
          name: 'visibilidade',
          type: 'select',
          values: ['organizacao', 'equipe', 'privado'],
          maxSelect: 1,
        },
        { name: 'assinatura_texto', type: 'text' },
        {
          name: 'assinatura_posicao',
          type: 'select',
          values: ['rodape', 'topo', 'nenhuma'],
          maxSelect: 1,
        },
        { name: 'rejeitar_ligacoes', type: 'bool' },
        {
          name: 'owner',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_channel_conn_tipo ON channel_connections (tipo)',
        'CREATE INDEX idx_channel_conn_status ON channel_connections (status)',
      ],
    })
    app.save(connections)

    // 2. channel_conversations
    const conversations = new Collection({
      name: 'channel_conversations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      fields: [
        {
          name: 'connection',
          type: 'relation',
          collectionId: connections.id,
          required: true,
          maxSelect: 1,
        },
        {
          name: 'contact',
          type: 'relation',
          collectionId: contacts.id,
          maxSelect: 1,
        },
        { name: 'cliente_nome', type: 'text', required: true },
        { name: 'cliente_identificador', type: 'text', required: true }, // telefone internacional ou ig username/id
        { name: 'ultima_mensagem', type: 'text' },
        { name: 'ultima_mensagem_em', type: 'date' },
        { name: 'nao_lidas', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'fechada', 'aguardando', 'arquivada'],
          maxSelect: 1,
        },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_channel_conv_conn ON channel_conversations (connection)',
        'CREATE INDEX idx_channel_conv_ident ON channel_conversations (cliente_identificador)',
        'CREATE INDEX idx_channel_conv_status ON channel_conversations (status)',
        'CREATE INDEX idx_channel_conv_updated ON channel_conversations (updated DESC)',
      ],
    })
    app.save(conversations)

    // 3. channel_messages
    const messages = new Collection({
      name: 'channel_messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      fields: [
        {
          name: 'conversation',
          type: 'relation',
          collectionId: conversations.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'direcao',
          type: 'select',
          required: true,
          values: ['entrada', 'saida', 'sistema'],
          maxSelect: 1,
        },
        { name: 'texto', type: 'text', required: true },
        {
          name: 'status_envio',
          type: 'select',
          values: ['enviada', 'entregue', 'lida', 'falha', 'simulada'],
          maxSelect: 1,
        },
        { name: 'midia_url', type: 'text' },
        { name: 'message_id_externo', type: 'text' },
        {
          name: 'autor',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_channel_msg_conv ON channel_messages (conversation, created)',
        'CREATE INDEX idx_channel_msg_dir ON channel_messages (direcao)',
      ],
    })
    app.save(messages)

    // Seed de demonstração: 2 canais iniciais semelhantes à captura (WhatsApp e Instagram)
    try {
      let adminUser = null
      try {
        adminUser = app.findFirstRecordByData('users', 'role', 'admin')
      } catch (_) {
        const anyU = app.findRecordsByFilter('users', '', '+created', 1, 0)
        if (anyU.length > 0) adminUser = anyU[0]
      }

      const conn1 = new Record(connections)
      conn1.set('name', 'Whatsapp - Clínica (11 91159-0799)')
      conn1.set('tipo', 'whatsapp_cloud')
      conn1.set('status', 'ativo')
      conn1.set('conexao_status', 'conectado')
      conn1.set('numero_conectado', '+55 (11) 91159-0799')
      conn1.set('visibilidade', 'organizacao')
      conn1.set('assinatura_posicao', 'rodape')
      conn1.set('assinatura_texto', 'Atenciosamente, Equipe Comercial')
      if (adminUser) conn1.set('owner', adminUser.id)
      app.save(conn1)

      const conn2 = new Record(connections)
      conn2.set('name', 'Pós-Operatório (11 99691-8378)')
      conn2.set('tipo', 'whatsapp')
      conn2.set('status', 'ativo')
      conn2.set('conexao_status', 'desconectado')
      conn2.set('numero_conectado', '+55 (11) 99691-8378')
      conn2.set('visibilidade', 'organizacao')
      conn2.set('assinatura_posicao', 'rodape')
      if (adminUser) conn2.set('owner', adminUser.id)
      app.save(conn2)

      const conn3 = new Record(connections)
      conn3.set('name', 'Instagram')
      conn3.set('tipo', 'instagram')
      conn3.set('status', 'inativo')
      conn3.set('conexao_status', 'desconectado')
      conn3.set('visibilidade', 'organizacao')
      conn3.set('assinatura_posicao', 'nenhuma')
      if (adminUser) conn3.set('owner', adminUser.id)
      app.save(conn3)

      // Seed de 1 conversa demonstrativa no canal 1
      const conv1 = new Record(conversations)
      conv1.set('connection', conn1.id)
      conv1.set('cliente_nome', 'Mariana Albuquerque')
      conv1.set('cliente_identificador', '+5511987654321')
      conv1.set('ultima_mensagem', 'Olá! Gostaria de saber mais sobre o plano de implantes.')
      conv1.set('ultima_mensagem_em', new Date().toISOString())
      conv1.set('nao_lidas', 1)
      conv1.set('status', 'aberta')
      if (adminUser) conv1.set('responsavel', adminUser.id)
      app.save(conv1)

      const msg1 = new Record(messages)
      msg1.set('conversation', conv1.id)
      msg1.set('direcao', 'entrada')
      msg1.set('texto', 'Olá! Gostaria de saber mais sobre o plano de implantes.')
      msg1.set('status_envio', 'entregue')
      app.save(msg1)
    } catch (seedErr) {
      console.log('Aviso ao semear conexões de demonstração:', seedErr)
    }
  },
  (app) => {
    try {
      const messages = app.findCollectionByNameOrId('channel_messages')
      app.delete(messages)
    } catch (_) {}
    try {
      const conversations = app.findCollectionByNameOrId('channel_conversations')
      app.delete(conversations)
    } catch (_) {}
    try {
      const connections = app.findCollectionByNameOrId('channel_connections')
      app.delete(connections)
    } catch (_) {}
  },
)
