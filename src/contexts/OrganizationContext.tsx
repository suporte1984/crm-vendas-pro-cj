import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

export const DEFAULT_ORG_NAME = 'Vendas Pro CRM'

interface OrganizationContextValue {
  /** Nome da organização exibido na interface (padrão: "Vendas Pro CRM") */
  nome: string
  /** Configuração bruta do banco (pode não existir ainda) */
  settings: { id: string; nome_organizacao?: string } | null
  loading: boolean
  /** Se o usuário atual pode editar (admin/gestor) */
  canEdit: boolean
  save: (nome: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<OrganizationContextValue['settings']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const list = await pb.collection('app_settings').getList(1, 1, { sort: '-updated' })
        if (!cancelled) setSettings(list.items[0] ?? null)
      } catch {
        if (!cancelled) setSettings(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const canEdit = useMemo(() => user?.role === 'admin' || user?.role === 'gestor', [user?.role])

  const save = async (nome: string) => {
    const clean = nome.trim()
    if (!clean) throw new Error('Informe o nome da organização.')
    if (settings) {
      const updated = await pb.collection('app_settings').update(settings.id, {
        nome_organizacao: clean,
      })
      setSettings(updated as OrganizationContextValue['settings'])
    } else {
      // Primeira configuração do workspace: criada via hook apenas por admin/gestor
      const created = await pb.send('/backend/v1/vendas-pro/org-name', {
        method: 'POST',
        body: { nome: clean },
      })
      setSettings(created as OrganizationContextValue['settings'])
    }
  }

  const nome = settings?.nome_organizacao?.trim() || DEFAULT_ORG_NAME

  return (
    <OrganizationContext.Provider value={{ nome, settings, loading, canEdit, save }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization deve ser usado dentro de OrganizationProvider')
  return ctx
}
