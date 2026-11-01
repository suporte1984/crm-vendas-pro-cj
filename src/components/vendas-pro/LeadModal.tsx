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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoneyInput } from '@/components/vendas-pro/MoneyInput'
import type { Lead, LeadOrigem, LeadStatus, Product } from '@/types/vendasPro'
import type { UserRecord } from '@/types/crm'

interface LeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  products: Product[]
  users: UserRecord[]
  onSave: (data: Partial<Lead>) => Promise<void>
}

export function LeadModal({ open, onOpenChange, lead, products, users, onSave }: LeadModalProps) {
  const [nome, setNome] = useState(lead?.nome || '')
  const [empresa, setEmpresa] = useState(lead?.empresa || '')
  const [email, setEmail] = useState(lead?.email || '')
  const [telefone, setTelefone] = useState(lead?.telefone || '')
  const [origem, setOrigem] = useState<LeadOrigem>(lead?.origem || 'site')
  const [status, setStatus] = useState<LeadStatus>(lead?.status || 'novo')
  const [valorEstimado, setValorEstimado] = useState<number>(lead?.valor_estimado || 0)
  const [produtoInteresseId, setProdutoInteresseId] = useState(
    lead?.produto_interesse_id || 'nenhum',
  )
  const [responsavelId, setResponsavelId] = useState(lead?.responsavel_id || '')
  const [proximaAcaoEm, setProximaAcaoEm] = useState(
    lead?.proxima_acao_em ? lead.proxima_acao_em.slice(0, 10) : '',
  )
  const [loading, setLoading] = useState(false)

  function handleOpenChange(val: boolean) {
    if (val && lead) {
      setNome(lead.nome || '')
      setEmpresa(lead.empresa || '')
      setEmail(lead.email || '')
      setTelefone(lead.telefone || '')
      setOrigem(lead.origem || 'site')
      setStatus(lead.status || 'novo')
      setValorEstimado(lead.valor_estimado || 0)
      setProdutoInteresseId(lead.produto_interesse_id || 'nenhum')
      setResponsavelId(lead.responsavel_id || '')
      setProximaAcaoEm(lead.proxima_acao_em ? lead.proxima_acao_em.slice(0, 10) : '')
    } else if (val) {
      setNome('')
      setEmpresa('')
      setEmail('')
      setTelefone('')
      setOrigem('site')
      setStatus('novo')
      setValorEstimado(0)
      setProdutoInteresseId('nenhum')
      setResponsavelId('')
      setProximaAcaoEm('')
    }
    onOpenChange(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    try {
      await onSave({
        nome: nome.trim(),
        empresa: empresa.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        origem,
        status,
        valor_estimado: valorEstimado || 0,
        produto_interesse_id:
          produtoInteresseId && produtoInteresseId !== 'nenhum' ? produtoInteresseId : undefined,
        responsavel_id: responsavelId || undefined,
        proxima_acao_em: proximaAcaoEm ? new Date(proximaAcaoEm).toISOString() : undefined,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[560px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#1e293b]">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Preencha as informações do lead para qualificação e conversão no funil.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Nome do Contato *</label>
              <Input
                required
                placeholder="Ex: Carlos Eduardo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Empresa</label>
              <Input
                placeholder="Ex: Delta Soluções"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">E-mail</label>
              <Input
                type="email"
                placeholder="carlos@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Telefone / WhatsApp</label>
              <Input
                placeholder="(11) 98888-7777"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Origem</label>
              <Select value={origem} onValueChange={(v) => setOrigem(v as LeadOrigem)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="anuncio">Anúncio</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <MoneyInput label="Valor Estimado" value={valorEstimado} onChange={setValorEstimado} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Produto de Interesse</label>
              <Select value={produtoInteresseId} onValueChange={setProdutoInteresseId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum / Indefinido</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Responsável</label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">Próxima Ação Em</label>
            <Input
              type="date"
              value={proximaAcaoEm}
              onChange={(e) => setProximaAcaoEm(e.target.value)}
              className="h-8 text-[12px]"
            />
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
              type="submit"
              disabled={loading || !nome.trim()}
              className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
            >
              {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
              {lead ? 'Salvar Alterações' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
