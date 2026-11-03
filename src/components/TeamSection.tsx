import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Plus,
  Shield,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createTeamMember,
  listTeamMembers,
  updateTeamMember,
  type TeamMemberInput,
  type TeamRole,
} from '@/services/team'
import type { UserRecord } from '@/types/crm'

export function TeamSection() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<TeamMemberInput>({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
  })
  const [formError, setFormError] = useState('')

  const isPrivileged = user?.role === 'admin' || user?.role === 'gestor'
  const isAdmin = user?.role === 'admin'

  async function loadMembers() {
    try {
      setLoading(true)
      const list = await listTeamMembers()
      setMembers(list)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar equipe',
        description: getErrorMessage(err),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPrivileged) {
      loadMembers()
    }
  }, [isPrivileged])

  if (!isPrivileged) {
    return (
      <div className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-4 text-[12px] text-[#64748b]">
        Apenas administradores e gestores têm permissão para gerenciar a equipe de vendas.
      </div>
    )
  }

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      return setFormError('Informe o nome do vendedor.')
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return setFormError('Informe um e-mail corporativo válido.')
    }
    if (!formData.password || formData.password.length < 8) {
      return setFormError('A senha inicial deve ter no mínimo 8 caracteres.')
    }

    try {
      setBusy(true)
      await createTeamMember({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      })

      toast({
        title: 'Membro adicionado com sucesso',
        description: `${formData.name} foi cadastrado como ${formData.role}.`,
      })

      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'vendedor',
      })
      setModalOpen(false)
      await loadMembers()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleStatus(member: UserRecord) {
    const isAtivo = member.ativo !== false // default true se undefined
    const nextStatus = !isAtivo

    try {
      setActionBusyId(member.id)
      await updateTeamMember(member.id, { ativo: nextStatus })
      toast({
        title: nextStatus ? 'Vendedor ativado' : 'Vendedor desativado',
        description: `${member.name} agora está ${nextStatus ? 'ativo' : 'inativo'}.`,
      })
      await loadMembers()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
      })
    } finally {
      setActionBusyId(null)
    }
  }

  async function handleChangeRole(member: UserRecord, nextRole: TeamRole) {
    if (member.role === nextRole) return
    try {
      setActionBusyId(member.id)
      await updateTeamMember(member.id, { role: nextRole })
      toast({
        title: 'Papel atualizado',
        description: `${member.name} agora tem o papel de ${nextRole}.`,
      })
      await loadMembers()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar papel',
        description: getErrorMessage(err),
      })
    } finally {
      setActionBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[12px] text-[#64748b]">
            Gerencie os vendedores e gestores que possuem acesso ao CRM e ao módulo Vendas PRO.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setModalOpen(true)
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-500 px-3 text-[11px] font-bold text-white shadow-xs transition hover:bg-amber-600 self-start sm:self-auto"
        >
          <UserPlus className="size-3.5" /> Adicionar Vendedor
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-[12px] text-[#64748b]">
          <LoaderCircle className="mr-2 size-4 animate-spin text-amber-500" />
          Carregando equipe…
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center text-[12px] text-[#64748b]">
          Nenhum membro cadastrado além de você. Clique em "Adicionar Vendedor" para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white">
          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-[#e5e7eb] bg-[#f8fafc] text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Membro</th>
                <th className="py-2.5 px-3">E-mail</th>
                <th className="py-2.5 px-3">Papel</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {members.map((member) => {
                const isAtivo = member.ativo !== false
                const isCurrent = member.id === user?.id
                const isActionBusy = actionBusyId === member.id

                return (
                  <tr key={member.id} className="transition hover:bg-[#f8fafc]">
                    <td className="py-2.5 px-3 font-semibold text-[#1c1c1e]">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>
                          {member.name || 'Sem nome'}{' '}
                          {isCurrent && (
                            <span className="ml-1 rounded bg-[#f1f5f9] px-1 py-0.5 text-[9px] text-[#64748b]">
                              (Você)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">{member.email}</td>
                    <td className="py-2.5 px-3">
                      {isCurrent || (!isAdmin && member.role === 'admin') ? (
                        <span className="capitalize font-medium text-[#1c1c1e]">{member.role}</span>
                      ) : (
                        <select
                          disabled={isActionBusy}
                          value={member.role}
                          onChange={(e) => handleChangeRole(member, e.target.value as TeamRole)}
                          className="rounded border border-[#e2e8f0] bg-white px-2 py-1 text-[10px] text-[#1c1c1e] outline-none hover:border-[#cbd5e1] focus:border-amber-500"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="gestor">Gestor</option>
                          <option value="member">Membro</option>
                          {isAdmin && <option value="admin">Administrador</option>}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {isAtivo ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          <AlertCircle className="size-3 text-slate-500" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!isCurrent && (
                        <button
                          type="button"
                          disabled={isActionBusy}
                          onClick={() => handleToggleStatus(member)}
                          className="rounded px-2 py-1 text-[10px] font-medium transition hover:bg-[#f1f5f9]"
                        >
                          {isActionBusy ? (
                            <LoaderCircle className="size-3 animate-spin text-[#64748b]" />
                          ) : isAtivo ? (
                            <span className="text-red-600 hover:text-red-700">Desativar</span>
                          ) : (
                            <span className="text-emerald-600 hover:text-emerald-700">
                              Reativar
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Adicionar Vendedor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <UserPlus className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1c1c1e]">Adicionar Vendedor</h3>
                  <p className="text-[10px] text-[#64748b]">Novo membro para o time de vendas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs text-[#94a3b8] hover:text-[#1c1c1e]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="mt-4 space-y-3">
              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#475569]">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Carlos Oliveira"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[#cbd5e1] px-2.5 py-1.5 text-xs text-[#1c1c1e] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569]">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[#cbd5e1] px-2.5 py-1.5 text-xs text-[#1c1c1e] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569]">
                  Senha Inicial
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[#cbd5e1] px-2.5 py-1.5 text-xs text-[#1c1c1e] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="mt-1 block text-[10px] text-[#94a3b8]">
                  O vendedor poderá alterar a senha nas Configurações da conta.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569]">
                  Papel no CRM
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamRole })}
                  className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs text-[#1c1c1e] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="vendedor">Vendedor (padrão - apenas seus leads/vendas)</option>
                  <option value="gestor">Gestor (acesso a todo o time)</option>
                  <option value="member">Membro (padrão básico)</option>
                  {isAdmin && <option value="admin">Administrador do Sistema</option>}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-[#cbd5e1] px-3 py-1.5 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 disabled:opacity-60"
                >
                  {busy && <LoaderCircle className="size-3 animate-spin" />}
                  Salvar Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
