import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/crm'

export type TeamRole = UserRecord['role']

export interface TeamMemberInput {
  name: string
  email: string
  password: string
  role: TeamRole
}

/** Lista todos os usuários do workspace (requer papel admin/gestor). */
export async function listTeamMembers() {
  return pb.collection<UserRecord>('users').getFullList({
    sort: '-created',
  })
}

/**
 * Cria um novo vendedor/usuário. A validação de papel é feita no servidor
 * (hook onRecordCreateRequest): apenas admin/gestor podem definir papel.
 */
export async function createTeamMember(data: TeamMemberInput) {
  return pb.collection<UserRecord>('users').create({
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    role: data.role,
    ativo: true,
    emailVisibility: true,
  })
}

/** Atualiza nome, papel ou status (ativo/inativo) de um membro da equipe. */
export async function updateTeamMember(
  id: string,
  data: Partial<{ name: string; role: TeamRole; ativo: boolean }>,
) {
  return pb.collection<UserRecord>('users').update(id, data)
}
