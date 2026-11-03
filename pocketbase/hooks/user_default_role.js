onRecordCreateRequest((e) => {
  const authRecord = e.auth
  const isPrivileged =
    authRecord &&
    (authRecord.getString('role') === 'admin' || authRecord.getString('role') === 'gestor')

  const requestedRole = e.record.getString('role')

  if (isPrivileged) {
    // Admin ou Gestor criando um membro da equipe
    // Se nenhum papel for informado, padrão é 'vendedor'
    if (!requestedRole) {
      e.record.set('role', 'vendedor')
    } else if (requestedRole === 'admin' && authRecord.getString('role') !== 'admin') {
      // Gestor não pode criar outro admin
      throw new ForbiddenError('Apenas administradores podem criar novos administradores.')
    }
    // Garante ativo = true se não definido
    if (!e.record.get('ativo')) {
      e.record.set('ativo', true)
    }
  } else {
    // Cadastro público / signup anônimo / usuário comum:
    // NUNCA aceita papel administrativo; sempre fixa 'member'
    e.record.set('role', 'member')
    e.record.set('ativo', true)
  }

  e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Apenas usuários autenticados podem atualizar cadastros.')
  }

  const isPrivileged =
    authRecord.getString('role') === 'admin' || authRecord.getString('role') === 'gestor'

  // Se o papel estiver sendo alterado
  const originalRole = e.record.original().getString('role')
  const newRole = e.record.getString('role')

  if (newRole && newRole !== originalRole) {
    if (!isPrivileged) {
      throw new ForbiddenError('Você não tem permissão para alterar o papel de um usuário.')
    }
    if (newRole === 'admin' && authRecord.getString('role') !== 'admin') {
      throw new ForbiddenError('Apenas administradores podem atribuir o papel de admin.')
    }
  }

  // Se o status 'ativo' estiver sendo alterado
  const originalAtivo = e.record.original().getBool('ativo')
  const newAtivo = e.record.getBool('ativo')
  if (newAtivo !== originalAtivo && !isPrivileged) {
    throw new ForbiddenError(
      'Apenas administradores ou gestores podem ativar ou desativar usuários.',
    )
  }

  e.next()
}, 'users')
