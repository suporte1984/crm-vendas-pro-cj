import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Lead } from '@/types/vendasPro'

interface LostLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onConfirm: (motivo: string) => Promise<void>
}

const motivosPredefinidos = [
  'Preço / Restrição orçamentária',
  'Escolheu concorrente',
  'Não responde / Contato perdido',
  'Decisão postergada para o próximo ano/trimestre',
  'Necessidade atendida internamente',
  'Perfil fora do público-alvo (desqualificado)',
  'Outro',
]

export function LostLeadModal({ open, onOpenChange, lead, onConfirm }: LostLeadModalProps) {
  const [motivoSelect, setMotivoSelect] = useState(motivosPredefinidos[0])
  const [detalhes, setDetalhes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!lead) return
    setLoading(true)
    try {
      const finalMotivo = detalhes.trim() ? `${motivoSelect}: ${detalhes.trim()}` : motivoSelect

      await onConfirm(finalMotivo)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-rose-600">
            Marcar Lead como Perdido
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Informe o motivo de perda do lead{' '}
            <strong className="text-[#1e293b]">{lead?.nome}</strong> para alimentar as métricas de
            conversão.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">Motivo Principal *</label>
            <Select value={motivoSelect} onValueChange={setMotivoSelect}>
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {motivosPredefinidos.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">
              Observações Adicionais (opcional)
            </label>
            <Textarea
              placeholder="Explique detalhes da negociação ou feedback do cliente..."
              rows={3}
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              className="resize-none text-[12px]"
            />
          </div>
        </div>

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
            disabled={loading}
            onClick={handleConfirm}
            className="h-8 bg-rose-600 text-[12px] font-medium text-white hover:bg-rose-700"
          >
            {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
