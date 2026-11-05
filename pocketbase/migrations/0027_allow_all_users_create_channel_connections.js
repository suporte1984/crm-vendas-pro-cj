migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('channel_connections')

    // Qualquer usuário autenticado pode CRIAR conexões — desde que assuma a
    // propriedade (owner) da própria conexão criada.
    col.createRule = "@request.auth.id != '' && @request.body.owner = @request.auth.id"

    // Admin/gestor gerenciam tudo; o dono gerencia as conexões que ele mesmo
    // criou (sem poder reatribuir o owner para outra pessoa).
    const manageOwnOrAdmin =
      "@request.auth.id != '' && ((@request.auth.role = 'admin' || @request.auth.role = 'gestor') || (owner = @request.auth.id && @request.body.owner:changed = false))"
    col.updateRule = manageOwnOrAdmin
    col.deleteRule = manageOwnOrAdmin

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('channel_connections')

    const adminOnly =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    col.createRule = adminOnly
    col.updateRule = adminOnly
    col.deleteRule = adminOnly

    app.save(col)
  },
)
