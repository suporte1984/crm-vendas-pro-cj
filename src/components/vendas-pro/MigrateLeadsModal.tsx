import { useState } from 'react'
import { Check, LoaderCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ContractPeriodicidade, Lead } from '@/types/vendasPro'

interface MigrateLeadsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  convertedLeads: Lead[]
  onMigrate: (
    selectedLeads: Lead[],
    params: {
      periodicidade: ContractPeriodicidade
      data_inicio: string
      data_fim: string
    },
  ) => Promise<void>
}

export function MigrateLeadsModal({
  open,
  onOpenChange,
  convertedLeads,
  onMigrate,
}: MigrateLeadsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(convertedLeads.map((l) => l.id))
  const [periodicidade, setPeriodicidade] = useState<ContractPeriodicidade>('mensal')
  const [loading, setLoading] = useState(false)

  function toggleLead(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    if (selectedIds.length === convertedLeads.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(convertedLeads.map((l) => l.id))
    }
  }

  async function handleConfirm() {
    const targets = convertedLeads.filter((l) => selectedIds.includes(l.id))
    if (targets.length === 0) return

    setLoading(true)
    try {
      const now = new Date()
      const data_inicio = now.toISOString()
      const data_fim = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

      await onMigrate(targets, {
        periodicidade,
        data_inicio,
        data_fim,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#1e293b]">
            Migrar Leads Convertidos para Contratos
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Selecione os leads convertidos sem contrato para gerar minutas de contrato
            pré-preenchidas em lote.
          </DialogDescription>
        </DialogHeader>

        {convertedLeads.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[#64748b]">
            Nenhum lead convertido pendente de contrato no momento.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2 text-[12px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    selectedIds.length === convertedLeads.length && convertedLeads.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
                <span className="font-medium text-[#475569]">Selecionar todos</span>
              </div>
              <span className="font-mono text-[11px] text-[#64748b]">
                {selectedIds.length} de {convertedLeads.length} selecionados
              </span>
            </div>

            <div className="max-h-[220px] overflow-y-auto divide-y divide-[#f1f5f9] rounded border border-[#e2e8f0]">
              {convertedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-2.5 hover:bg-[#f8fafc]"
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                    />
                    <div>
                      <p className="text-[12px] font-semibold text-[#0f172a]">{lead.nome}</p>
                      <p className="text-[11px] text-[#64748b]">
                        {lead.empresa || 'Sem empresa'} • Contato:{' '}
                        {lead.contato_id ? 'Vinculado' : 'Automático'}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#0f172a]">
                    {lead.valor_estimado
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        }).format(lead.valor_estimado)
                      : 'R$ 1.000'}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">
                Periodicidade Padrão dos Contratos Gerados
              </label>
              <Select
                value={periodicidade}
                onValueChange={(v) => setPeriodicidade(v as ContractPeriodicidade)}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="único">Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-8 border-[#e2e8f0] text-[12px]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || selectedIds.length === 0}
            onClick={handleConfirm}
            className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
          >
            {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
            Gerar {selectedIds.length} Contrato(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
