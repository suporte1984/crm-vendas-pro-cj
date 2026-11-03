/// <reference path="../pb_data/types.d.ts" />
// Hook: cria a primeira configuração de organização (app_settings está vazio).
// Apenas admin/gestor podem criar; se já existir um registro, só atualiza.
routerAdd('POST', '/backend/v1/vendas-pro/org-name', (e) => {
  const info = $app.findCollectionByNameOrId('app_settings')

  const auth = e.auth
  if (!auth || (auth.getString('role') !== 'admin' && auth.getString('role') !== 'gestor')) {
    throw new ApiError(
      403,
      'Apenas administradores ou gestores podem alterar o nome da organização.',
    )
  }

  const nome = String(e.requestInfo().body.nome || '').trim()
  if (!nome) throw new ApiError(400, 'Informe o nome da organização.')
  if (nome.length > 80) throw new ApiError(400, 'Nome muito longo (máx. 80 caracteres).')

  let record = $app.findFirstRecordByFilter(info, '', '')
  if (record) {
    record.set('nome_organizacao', nome)
    $app.save(record)
  } else {
    record = new Record(info)
    record.set('nome_organizacao', nome)
    $app.save(record)
  }

  return e.json(200, { id: record.id, nome_organizacao: record.getString('nome_organizacao') })
})
