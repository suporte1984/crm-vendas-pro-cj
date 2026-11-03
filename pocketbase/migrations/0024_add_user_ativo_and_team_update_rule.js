/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // 1. Adicionar campo 'ativo' (bool) se ainda não existir
    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }

    // 2. Atualizar regra de update de users para permitir que admin/gestor atualizem outros usuários
    // ou o próprio usuário atualize o seu registro (sem auto-atribuir papel privilegiado)
    users.updateRule =
      "@request.auth.id != '' && (" +
      'id = @request.auth.id || ' +
      "@request.auth.role = 'admin' || " +
      "@request.auth.role = 'gestor'" +
      ')'

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const ativo = users.fields.getByName('ativo')
    if (ativo) {
      users.fields.removeById(ativo.id)
    }
    users.updateRule = 'id = @request.auth.id'
    app.save(users)
  },
)
