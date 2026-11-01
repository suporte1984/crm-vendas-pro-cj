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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoneyInput } from '@/components/vendas-pro/MoneyInput'
import { calculateCommissionValue, calculateNetValue } from '@/lib/vendasProCalculations'
import type { Contract, Product, Sale } from '@/types/vendasPro'
import type { Contact, Deal, UserRecord } from '@/types/crm'

interface SaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  products: Product[]
  contracts: Contract[]
  deals: Deal[]
  users: UserRecord[]
  onSave: (data: {
    cliente_id: string
    produto_id?: string
    contrato_id?: string
    deal_id?: string
    valor_bruto: number
    desconto?: number
    comissao_percentual?: number
    data_venda: string
    vendedor_id?: string
    forma_pagamento?: string
    parcelas?: number
    observacoes?: string
  }) => Promise<void>
}

export function SaleModal({
  open,
  onOpenChange,
  contacts,
  products,
  contracts,
  deals,
  users,
  onSave,
}: SaleModalProps) {
  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState('nenhum')
  const [contratoId, setContratoId] = useState('nenhum')
  const [dealId, setDealId] = useState('nenhum')
  const [valorBruto, setValorBruto] = useState<number>(0)
  const [desconto, setDesconto] = useState<number>(0)
  const [comissaoPercentual, setComissaoPercentual] = useState<number>(10)
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10))
  const [vendedorId, setVendedorId] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Boleto Bancário')
  const [parcelas, setParcelas] = useState<number>(1)
  const [observacoes, setObservacoes] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function handleOpenChange(val: boolean) {
    if (val) {
      setClienteId('')
      setProdutoId('nenhum')
      setContratoId('nenhum')
      setDealId('nenhum')
      setValorBruto(0)
      setDesconto(0)
      setComissaoPercentual(10)
      setDataVenda(new Date().toISOString().slice(0, 10))
      setVendedorId('')
      setFormaPagamento('Boleto Bancário')
      setParcelas(1)
      setObservacoes('')
      setErrorMsg('')
    }
    onOpenChange(val)
  }

  // Ao selecionar produto, preenche valor_bruto e comissao_percentual padrão
  function handleSelectProduct(pId: string) {
    setProdutoId(pId)
    if (pId !== 'nenhum') {
      const prod = products.find((p) => p.id === pId)
      if (prod) {
        if (prod.preco_base && valorBruto === 0) {
          setValorBruto(prod.preco_base)
        }
        if (prod.comissao_percentual_padrao) {
          setComissaoPercentual(prod.comissao_percentual_padrao)
        }
      }
    }
  }

  const valorLiquido = calculateNetValue(valorBruto, desconto)
  const valorComissao = calculateCommissionValue(valorLiquido, comissaoPercentual)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!clienteId) {
      setErrorMsg('Selecione um cliente obrigatório.')
      return
    }
    if (valorBruto <= 0) {
      setErrorMsg('O valor bruto deve ser maior que zero.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        cliente_id: clienteId,
        produto_id: produtoId !== 'nenhum' ? produtoId : undefined,
        contrato_id: contratoId !== 'nenhum' ? contratoId : undefined,
        deal_id: dealId !== 'nenhum' ? dealId : undefined,
        valor_bruto: valorBruto,
        desconto,
        comissao_percentual: comissaoPercentual,
        data_venda: new Date(dataVenda).toISOString(),
        vendedor_id: vendedorId || undefined,
        forma_pagamento: formaPagamento || 'Boleto Bancário',
        parcelas: Math.max(1, parcelas),
        observacoes: observacoes.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[580px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#1e293b]">Nova Venda</DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Cadastre a venda. As parcelas serão geradas automaticamente com vencimentos mensais.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mt-1 rounded bg-rose-50 p-2 text-[11px] font-medium text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Cliente *</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Produto / Serviço</label>
              <Select value={produtoId} onValueChange={handleSelectProduct}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum / Avulso</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MoneyInput label="Valor Bruto *" value={valorBruto} onChange={setValorBruto} />
            <MoneyInput label="Desconto" value={desconto} onChange={setDesconto} />
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Valor Líquido</label>
              <div className="flex h-8 items-center justify-end rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2.5 font-mono text-[12px] font-semibold text-[#0f172a]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valorLiquido,
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Data da Venda</label>
              <Input
                type="date"
                required
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Vendedor / Resp.</label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
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

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Comissão (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={comissaoPercentual}
                onChange={(e) => setComissaoPercentual(Number(e.target.value))}
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Forma de Pagamento</label>
              <Input
                placeholder="Ex: Boleto Bancário, Pix, Cartão..."
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">
                Número de Parcelas (mensais)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={parcelas}
                onChange={(e) => setParcelas(Math.max(1, Number(e.target.value)))}
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">Vínculo com Contrato</label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#475569]">
                Vínculo com Negócio (Deal)
              </label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} - {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#475569]">Observações</label>
            <Textarea
              placeholder="Detalhes adicionais..."
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="resize-none text-[12px]"
            />
          </div>

          <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-[11px] text-[#64748b]">
            <p>
              Parcelamento estimado:{' '}
              <strong className="text-[#0f172a]">
                {parcelas}x de ~
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valorLiquido / (parcelas || 1),
                )}
              </strong>
              {' • '}
              Comissão do vendedor:{' '}
              <strong className="text-emerald-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valorComissao,
                )}
              </strong>
            </p>
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
              disabled={loading}
              className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
            >
              {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
              Gerar Venda & Parcelas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
