import pb from '@/lib/pocketbase/client'
import type { AuditLog } from '@/types/vendasPro'

export async function logAudit(data: {
  entidade_tipo: AuditLog['entidade_tipo']
  entidade_id: string
  acao: string
  campo?: string
  valor_anterior?: string
  valor_novo?: string
  detalhes?: Record<string, unknown>
}) {
  try {
    return await pb.collection<AuditLog>('audit_logs').create({
      usuario_id: pb.authStore.record?.id,
      ...data,
    })
  } catch (err) {
    console.warn('[AuditLog] Erro ao gravar log de auditoria:', err)
    return null
  }
}

export async function listAuditLogsForEntity(
  entidade_tipo: AuditLog['entidade_tipo'],
  entidade_id: string,
) {
  return pb.collection<AuditLog>('audit_logs').getFullList({
    filter: `entidade_tipo = "${entidade_tipo}" && entidade_id = "${entidade_id}"`,
    sort: '-created',
    expand: 'usuario_id',
  })
}
