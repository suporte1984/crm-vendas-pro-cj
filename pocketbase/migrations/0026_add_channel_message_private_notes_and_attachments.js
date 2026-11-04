migrate(
  (app) => {
    // 1. Atualizar channel_messages com campos:
    // - tipo_mensagem: 'mensagem' | 'nota_privada'
    // - anexo: FileField (imagens/documentos/áudios)
    // - nome_anexo: TextField (nome original do arquivo)
    const messages = app.findCollectionByNameOrId('channel_messages')

    if (!messages.fields.getByName('tipo_mensagem')) {
      messages.fields.add(
        new SelectField({
          name: 'tipo_mensagem',
          values: ['mensagem', 'nota_privada'],
          maxSelect: 1,
        }),
      )
    }

    if (!messages.fields.getByName('anexo')) {
      messages.fields.add(
        new FileField({
          name: 'anexo',
          maxSelect: 1,
          maxSize: 20971520, // 20 MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/plain',
            'audio/mpeg',
            'audio/ogg',
            'audio/wav',
          ],
        }),
      )
    }

    if (!messages.fields.getByName('nome_anexo')) {
      messages.fields.add(
        new TextField({
          name: 'nome_anexo',
        }),
      )
    }

    app.save(messages)

    // 2. Adicionar campo 'is_grupo' em channel_conversations para suportar o filtro de grupos
    const conversations = app.findCollectionByNameOrId('channel_conversations')
    if (!conversations.fields.getByName('is_grupo')) {
      conversations.fields.add(
        new BoolField({
          name: 'is_grupo',
        }),
      )
    }
    app.save(conversations)
  },
  (app) => {
    try {
      const messages = app.findCollectionByNameOrId('channel_messages')
      if (messages.fields.getByName('tipo_mensagem')) {
        messages.fields.removeByName('tipo_mensagem')
      }
      if (messages.fields.getByName('anexo')) {
        messages.fields.removeByName('anexo')
      }
      if (messages.fields.getByName('nome_anexo')) {
        messages.fields.removeByName('nome_anexo')
      }
      app.save(messages)
    } catch (_) {}

    try {
      const conversations = app.findCollectionByNameOrId('channel_conversations')
      if (conversations.fields.getByName('is_grupo')) {
        conversations.fields.removeByName('is_grupo')
      }
      app.save(conversations)
    } catch (_) {}
  },
)
