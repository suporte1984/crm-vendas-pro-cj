/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Coleção de configurações do workspace (nome da organização exibida na interface)
    const settings = new Collection({
      name: 'app_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
      deleteRule: null,
      fields: [
        { name: 'nome_organizacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(settings)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('app_settings'))
    } catch (_) {}
  },
)
