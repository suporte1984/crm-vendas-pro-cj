// pocketbase/hooks/channels_meta_webhook.js
// Webhook para Meta Cloud API (WhatsApp Business & Instagram Direct) + Envio de Mensagens

// 1. GET: Verificação de Webhook da Meta (hub.mode, hub.verify_token, hub.challenge)
routerAdd('GET', '/backend/v1/channels/meta/webhook', (e) => {
  try {
    const query = e.requestInfo().query || {}
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    const configuredVerifyToken = $os.getenv('META_VERIFY_TOKEN') || 'adapta_meta_webhook_secret'

    if (mode === 'subscribe' && token === configuredVerifyToken) {
      console.log('Webhook Meta verificado com sucesso. Challenge:', challenge)
      return e.string(200, challenge || '')
    }

    console.log('Falha na verificação de webhook Meta. Recebido token:', token)
    return e.string(403, 'Forbidden: verify token mismatch')
  } catch (err) {
    return e.string(500, err.message || 'Internal error')
  }
})

// 2. POST: Recebimento de eventos da Meta (WhatsApp Cloud API e Instagram Direct)
routerAdd('POST', '/backend/v1/channels/meta/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const objectType = body.object // 'whatsapp_business_account' ou 'instagram' ou 'page'

    // Sempre responder 200 OK rapidamente para a Meta não reenviar
    if (!objectType || !Array.isArray(body.entry)) {
      return e.json(200, { status: 'ignored', reason: 'no entries' })
    }

    // Função interna para persistir contato, conversa e mensagem recebida
    const saveInboundMessage = (payload) => {
      try {
        const tipoCanal = payload.tipoCanal
        const identificadorExterno = payload.identificadorExterno
        const clienteIdentificador = payload.clienteIdentificador
        const clienteNome = payload.clienteNome
        const texto = payload.texto
        const messageIdExterno = payload.messageIdExterno
        const metadata = payload.metadata

        if (!clienteIdentificador || !texto) return

        // 1. Localizar canal correspondente ou o primeiro ativo do mesmo tipo
        let connectionRecord = null
        if (identificadorExterno) {
          try {
            const matches = $app.findRecordsByFilter(
              'channel_connections',
              `identificador_externo = "${identificadorExterno.replace(/"/g, '\\"')}" && status != "arquivado"`,
              '-created',
              1,
              0,
            )
            if (matches.length > 0) connectionRecord = matches[0]
          } catch (_) {}
        }

        if (!connectionRecord) {
          try {
            const typeMatches = $app.findRecordsByFilter(
              'channel_connections',
              `tipo = "${tipoCanal}" && status = "ativo"`,
              '-created',
              1,
              0,
            )
            if (typeMatches.length > 0) connectionRecord = typeMatches[0]
          } catch (_) {}
        }

        if (!connectionRecord) {
          try {
            const anyConn = $app.findRecordsByFilter(
              'channel_connections',
              `status != "arquivado"`,
              '+created',
              1,
              0,
            )
            if (anyConn.length > 0) connectionRecord = anyConn[0]
          } catch (_) {}
        }

        if (!connectionRecord) {
          console.log('Nenhuma conexão cadastrada para receber mensagem:', tipoCanal)
          return
        }

        // 2. Buscar ou criar Contato no CRM pelo telefone / identificador
        let contactRecord = null
        try {
          const cleanPhone = clienteIdentificador.replace(/\D/g, '')
          const contactsList = $app.findRecordsByFilter(
            'contacts',
            `phone ~ "${cleanPhone}" || phone ~ "${clienteIdentificador}"`,
            '-created',
            1,
            0,
          )
          if (contactsList.length > 0) {
            contactRecord = contactsList[0]
          }
        } catch (_) {}

        if (!contactRecord) {
          try {
            const contactsCol = $app.findCollectionByNameOrId('contacts')
            contactRecord = new Record(contactsCol)
            contactRecord.set('name', clienteNome || `Lead ${clienteIdentificador}`)
            contactRecord.set('phone', clienteIdentificador)
            contactRecord.set('status', 'lead')
            contactRecord.set(
              'notes',
              `Criado automaticamente via canal ${tipoCanal} (${connectionRecord.getString('name')})`,
            )
            const connOwner = connectionRecord.getString('owner')
            if (connOwner) contactRecord.set('owner', connOwner)
            $app.save(contactRecord)
          } catch (cErr) {
            console.log('Aviso ao criar contato automático:', cErr)
          }
        }

        // 3. Buscar ou criar conversa em channel_conversations
        let convRecord = null
        try {
          const convs = $app.findRecordsByFilter(
            'channel_conversations',
            `connection = "${connectionRecord.id}" && cliente_identificador = "${clienteIdentificador.replace(/"/g, '\\"')}"`,
            '-created',
            1,
            0,
          )
          if (convs.length > 0) convRecord = convs[0]
        } catch (_) {}

        const convCol = $app.findCollectionByNameOrId('channel_conversations')
        const nowIso = new Date().toISOString()

        if (!convRecord) {
          convRecord = new Record(convCol)
          convRecord.set('connection', connectionRecord.id)
          if (contactRecord) convRecord.set('contact', contactRecord.id)
          convRecord.set(
            'cliente_nome',
            clienteNome || (contactRecord ? contactRecord.getString('name') : clienteIdentificador),
          )
          convRecord.set('cliente_identificador', clienteIdentificador)
          convRecord.set('ultima_mensagem', texto)
          convRecord.set('ultima_mensagem_em', nowIso)
          convRecord.set('nao_lidas', 1)
          convRecord.set('status', 'aberta')
          const connOwner = connectionRecord.getString('owner')
          if (connOwner) convRecord.set('responsavel', connOwner)
          $app.save(convRecord)
        } else {
          const unread = (convRecord.getInt('nao_lidas') || 0) + 1
          convRecord.set('ultima_mensagem', texto)
          convRecord.set('ultima_mensagem_em', nowIso)
          convRecord.set('nao_lidas', unread)
          if (convRecord.getString('status') === 'fechada') {
            convRecord.set('status', 'aberta')
          }
          if (contactRecord && !convRecord.getString('contact')) {
            convRecord.set('contact', contactRecord.id)
          }
          $app.save(convRecord)
        }

        // 4. Gravar mensagem na coleção channel_messages
        const msgCol = $app.findCollectionByNameOrId('channel_messages')
        const msgRecord = new Record(msgCol)
        msgRecord.set('conversation', convRecord.id)
        msgRecord.set('direcao', 'entrada')
        msgRecord.set('texto', texto)
        msgRecord.set('status_envio', 'entregue')
        if (messageIdExterno) msgRecord.set('message_id_externo', messageIdExterno)
        if (metadata) msgRecord.set('metadata', metadata)
        $app.save(msgRecord)

        // Se o canal tiver automação de funil "estagio_abrir_chat", mover negócio se aplicável
        const estagioAbrir = connectionRecord.getString('estagio_abrir_chat')
        if (estagioAbrir && contactRecord) {
          try {
            const deals = $app.findRecordsByFilter(
              'deals',
              `contact = "${contactRecord.id}" && status = "aberto"`,
              '-created',
              1,
              0,
            )
            if (deals.length > 0) {
              const deal = deals[0]
              deal.set('stage', estagioAbrir)
              $app.save(deal)
            }
          } catch (_) {}
        }
      } catch (err) {
        console.log('Erro em saveInboundMessage:', err.message || err)
      }
    }

    const entries = body.entry

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      const messaging = Array.isArray(entry.messaging) ? entry.messaging : []

      // Tratar WhatsApp Cloud API (changes com value.messages)
      for (let c = 0; c < changes.length; c++) {
        const change = changes[c]
        const val = change.value || {}
        const messages = Array.isArray(val.messages) ? val.messages : []
        const contactsList = Array.isArray(val.contacts) ? val.contacts : []
        const metadata = val.metadata || {}
        const phoneNumberId = metadata.phone_number_id || ''
        const displayPhoneNumber = metadata.display_phone_number || ''

        for (let m = 0; m < messages.length; m++) {
          const msg = messages[m]
          const from = msg.from || ''
          const msgType = msg.type || 'text'
          let textContent = ''
          if (msgType === 'text' && msg.text && msg.text.body) {
            textContent = msg.text.body
          } else if (msgType === 'image') {
            textContent = '[Imagem recebida]'
          } else if (msgType === 'audio') {
            textContent = '[Áudio recebido]'
          } else if (msgType === 'document') {
            textContent = '[Documento recebido]'
          } else {
            textContent = `[Mensagem: ${msgType}]`
          }

          let contactName = from
          if (contactsList.length > 0 && contactsList[0].profile && contactsList[0].profile.name) {
            contactName = contactsList[0].profile.name
          }

          saveInboundMessage({
            tipoCanal: 'whatsapp_cloud',
            identificadorExterno: phoneNumberId,
            displayNumber: displayPhoneNumber,
            clienteIdentificador: from,
            clienteNome: contactName,
            texto: textContent,
            messageIdExterno: msg.id || '',
            metadata: msg,
          })
        }
      }

      // Tratar Instagram Direct (entry.messaging)
      for (let ig = 0; ig < messaging.length; ig++) {
        const item = messaging[ig]
        const sender = item.sender ? item.sender.id : ''
        const recipient = item.recipient ? item.recipient.id : ''
        const msg = item.message

        if (msg && sender && !msg.is_echo) {
          const textContent = msg.text || '[Mídia ou anexo do Instagram]'
          saveInboundMessage({
            tipoCanal: 'instagram',
            identificadorExterno: recipient,
            displayNumber: '',
            clienteIdentificador: sender,
            clienteNome: `Instagram @${sender}`,
            texto: textContent,
            messageIdExterno: msg.mid || '',
            metadata: item,
          })
        }
      }
    }

    return e.json(200, { status: 'processed' })
  } catch (err) {
    console.log('Erro no webhook Meta POST:', err.message || err)
    return e.json(200, { status: 'error_caught', error: err.message })
  }
})

// 3. POST: Envio de mensagem pelo atendente no CRM
// Rota: /backend/v1/channels/send
routerAdd('POST', '/backend/v1/channels/send', (e) => {
  try {
    const authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação necessária.' })
    }

    const body = e.requestInfo().body || {}
    const conversationId = body.conversation_id || ''
    const rawText = typeof body.texto === 'string' ? body.texto.trim() : ''
    const isNotaPrivada = Boolean(body.is_private || body.tipo_mensagem === 'nota_privada')

    if (!conversationId) {
      return e.badRequestError('ID da conversa é obrigatório.')
    }
    if (!rawText) {
      return e.badRequestError('Texto da mensagem não pode ser vazio.')
    }

    // Buscar conversa e canal
    let conversation = null
    try {
      conversation = $app.findRecordById('channel_conversations', conversationId)
    } catch (_) {
      return e.badRequestError('Conversa não encontrada.')
    }

    const connectionId = conversation.getString('connection')
    let connection = null
    try {
      connection = $app.findRecordById('channel_connections', connectionId)
    } catch (_) {
      return e.badRequestError('Conexão de canal associada não encontrada.')
    }

    // Se for NOTA PRIVADA: NUNCA despachar para o cliente! Salvar apenas no histórico interno
    if (isNotaPrivada) {
      const msgCol = $app.findCollectionByNameOrId('channel_messages')
      const msgRecord = new Record(msgCol)
      msgRecord.set('conversation', conversation.id)
      msgRecord.set('direcao', 'saida')
      msgRecord.set('tipo_mensagem', 'nota_privada')
      msgRecord.set('texto', rawText)
      msgRecord.set('status_envio', 'enviada')
      msgRecord.set('autor', authRecord.id)
      $app.save(msgRecord)

      // Atualizar timestamp da conversa sem marcar como mensagem enviada ao cliente
      conversation.set('updated', new Date().toISOString())
      $app.save(conversation)

      return e.json(200, {
        success: true,
        message_id: msgRecord.id,
        status_envio: 'enviada',
        is_simulated: false,
        is_private: true,
        info: 'Nota privada interna registrada com sucesso (visível apenas para a equipe).',
      })
    }

    // Aplicar assinatura se configurada (apenas para mensagens normais aos clientes)
    let finalTexto = rawText
    const assinaturaPos = connection.getString('assinatura_posicao')
    const assinaturaTxt = connection.getString('assinatura_texto')

    if (assinaturaTxt && assinaturaPos && assinaturaPos !== 'nenhuma') {
      const senderNick = authRecord.getString('name') || 'Atendente'
      const formattedSig = assinaturaTxt.replace(/\{\{nickname\}\}/gi, senderNick)
      if (assinaturaPos === 'rodape') {
        finalTexto = `${rawText}\n\n${formattedSig}`
      } else if (assinaturaPos === 'topo') {
        finalTexto = `${formattedSig}\n\n${rawText}`
      }
    }

    const channelType = connection.getString('tipo') // 'whatsapp', 'whatsapp_cloud', 'instagram'
    const recipientPhone = conversation.getString('cliente_identificador')

    // Verificar se as credenciais oficiais da Meta estão presentes nos Segredos
    const metaWaToken = $os.getenv('META_WHATSAPP_TOKEN') || ''
    const metaPhoneNumberId =
      connection.getString('identificador_externo') || $os.getenv('META_PHONE_NUMBER_ID') || ''
    const metaIgToken = $os.getenv('META_INSTAGRAM_TOKEN') || ''

    let dispatchStatus = 'simulada'
    let externalMsgId = ''
    let metaApiResponse = null
    let hasLiveCredentials = false

    if (channelType === 'whatsapp_cloud' && metaWaToken && metaPhoneNumberId) {
      hasLiveCredentials = true
      try {
        const cleanRecipient = recipientPhone.replace(/\D/g, '')
        const url = `https://graph.facebook.com/v21.0/${metaPhoneNumberId}/messages`
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${metaWaToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanRecipient,
            type: 'text',
            text: { preview_url: false, body: finalTexto },
          }),
          timeout: 10,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          dispatchStatus = 'enviada'
          const parsed = res.json || {}
          if (Array.isArray(parsed.messages) && parsed.messages[0]) {
            externalMsgId = parsed.messages[0].id || ''
          }
          metaApiResponse = parsed
        } else {
          dispatchStatus = 'falha'
          metaApiResponse = { statusCode: res.statusCode, raw: res.raw }
          console.log('Erro retornado pela Meta Cloud API:', res.raw)
        }
      } catch (httpErr) {
        dispatchStatus = 'falha'
        console.log('Exceção ao chamar Meta Cloud API:', httpErr.message || httpErr)
      }
    } else if (channelType === 'instagram' && metaIgToken) {
      hasLiveCredentials = true
      try {
        const url = `https://graph.facebook.com/v21.0/me/messages`
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${metaIgToken}`,
          },
          body: JSON.stringify({
            recipient: { id: recipientPhone },
            message: { text: finalTexto },
          }),
          timeout: 10,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          dispatchStatus = 'enviada'
          const parsed = res.json || {}
          externalMsgId = parsed.message_id || ''
          metaApiResponse = parsed
        } else {
          dispatchStatus = 'falha'
          metaApiResponse = { statusCode: res.statusCode, raw: res.raw }
        }
      } catch (httpErr) {
        dispatchStatus = 'falha'
      }
    } else {
      dispatchStatus = 'simulada'
    }

    // Gravar a mensagem enviada
    const msgCol = $app.findCollectionByNameOrId('channel_messages')
    const msgRecord = new Record(msgCol)
    msgRecord.set('conversation', conversation.id)
    msgRecord.set('direcao', 'saida')
    msgRecord.set('tipo_mensagem', 'mensagem')
    msgRecord.set('texto', finalTexto)
    msgRecord.set('status_envio', dispatchStatus)
    msgRecord.set('autor', authRecord.id)
    if (externalMsgId) msgRecord.set('message_id_externo', externalMsgId)
    if (metaApiResponse) msgRecord.set('metadata', metaApiResponse)
    $app.save(msgRecord)

    // Atualizar conversa
    conversation.set('ultima_mensagem', finalTexto)
    conversation.set('ultima_mensagem_em', new Date().toISOString())
    conversation.set('nao_lidas', 0)
    $app.save(conversation)

    return e.json(200, {
      success: true,
      message_id: msgRecord.id,
      status_envio: dispatchStatus,
      is_simulated: !hasLiveCredentials,
      info: !hasLiveCredentials
        ? 'Mensagem registrada no CRM em modo de teste (credenciais da Meta ainda não configuradas nos Segredos).'
        : 'Mensagem despachada via API oficial da Meta.',
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao enviar mensagem.' })
  }
})

// 4. GET: Status das Credenciais da Meta (para exibir na tela Conexões e no Chat)
routerAdd('GET', '/backend/v1/channels/meta/status', (e) => {
  try {
    const authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação necessária.' })
    }

    const hasWaToken = Boolean($os.getenv('META_WHATSAPP_TOKEN'))
    const hasPhoneId = Boolean($os.getenv('META_PHONE_NUMBER_ID'))
    const hasIgToken = Boolean($os.getenv('META_INSTAGRAM_TOKEN'))
    const hasVerifyToken = Boolean($os.getenv('META_VERIFY_TOKEN'))

    return e.json(200, {
      whatsapp_ready: hasWaToken && hasPhoneId,
      instagram_ready: hasIgToken,
      webhook_verify_ready: hasVerifyToken,
      expected_secrets: [
        {
          name: 'META_WHATSAPP_TOKEN',
          present: hasWaToken,
          description: 'Token de Acesso do Sistema da Meta (WhatsApp Business Cloud API)',
        },
        {
          name: 'META_PHONE_NUMBER_ID',
          present: hasPhoneId,
          description: 'ID do Número de Telefone no Meta for Developers',
        },
        {
          name: 'META_INSTAGRAM_TOKEN',
          present: hasIgToken,
          description: 'Token de Acesso da Página / Conta Profissional do Instagram',
        },
        {
          name: 'META_VERIFY_TOKEN',
          present: hasVerifyToken,
          description: 'Token de verificação do Webhook configurado no painel da Meta',
        },
      ],
      webhook_url: `${$os.getenv('PB_INSTANCE_URL') || 'https://crm-estilo-linear-clone-2c246.shrd01.internal.goskip.dev'}/backend/v1/channels/meta/webhook`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao verificar status.' })
  }
})
