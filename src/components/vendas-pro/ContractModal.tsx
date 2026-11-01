import { useState } from 'react'
import { Check, ChevronRight, LoaderCircle } from 'lucide-react'
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
import type {
  Contract,
  ContractPeriodicidade,
  ContractStatus,
  Product,
  Sale,
} from '@/types/vendasPro'
import type { Contact } from '@/types/crm'
import { cn } from '@/lib/utils'

interface ContractModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract?: Contract | null
  contacts: Contact[]
  products: Product[]
  sales: Sale[]
  onSave: (data: Partial<Contract>) => Promise<void>
}

type Step = 'cliente' | 'produto' | 'condicoes' | 'revisao'

export function ContractModal({
  open,
  onOpenChange,
  contract,
  contacts,
  products,
  sales,
  onSave,
}: ContractModalProps) {
  const [step, setStep] = useState<Step>('cliente')

  // Form states
  const [clienteId, setClienteId] = useState(contract?.cliente_id || '')
  const [produtoId, setProdutoId] = useState(contract?.produto_id || 'nenhum')
  const [dataInicio, setDataInicio] = useState(
    contract?.data_inicio
      ? contract.data_inicio.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [dataFim, setDataFim] = useState(
    contract?.data_fim
      ? contract.data_fim.slice(0, 10)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  )
  const [valorTotal, setValorTotal] = useState<number>(contract?.valor_total || 0)
  const [valorRecorrente, setValorRecorrente] = useState<number>(contract?.valor_recorrente || 0)
  const [periodicidade, setPeriodicidade] = useState<ContractPeriodicidade>(
    contract?.periodicidade || 'mensal',
  )
  const [status, setStatus] = useState<ContractStatus>(contract?.status || 'ativo')
  const [vendaId, setVendaId] = useState(contract?.venda_id || 'nenhuma')
  const [comissaoPercentual, setComissaoPercentual] = useState<number>(
    contract?.comissao_percentual || 10,
  )
  const [observacoes, setObservacoes] = useState(contract?.observacoes || '')
  const [anexoUrl, setAnexoUrl] = useState(contract?.anexo_url || '')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function handleOpenChange(val: boolean) {
    if (val && contract) {
      setClienteId(contract.cliente_id || '')
      setProdutoId(contract.produto_id || 'nenhum')
      setDataInicio(contract.data_inicio ? contract.data_inicio.slice(0, 10) : '')
      setDataFim(contract.data_fim ? contract.data_fim.slice(0, 10) : '')
      setValorTotal(contract.valor_total || 0)
      setValorRecorrente(contract.valor_recorrente || 0)
      setPeriodicidade(contract.periodicidade || 'mensal')
      setStatus(contract.status || 'ativo')
      setVendaId(contract.venda_id || 'nenhuma')
      setComissaoPercentual(contract.comissao_percentual || 10)
      setObservacoes(contract.observacoes || '')
      setAnexoUrl(contract.anexo_url || '')
      setStep('cliente')
    } else if (val) {
      setClienteId('')
      setProdutoId('nenhum')
      setDataInicio(new Date().toISOString().slice(0, 10))
      setDataFim(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      setValorTotal(0)
      setValorRecorrente(0)
      setPeriodicidade('mensal')
      setStatus('ativo')
      setVendaId('nenhuma')
      setComissaoPercentual(10)
      setObservacoes('')
      setAnexoUrl('')
      setStep('cliente')
    }
    setErrorMsg('')
    onOpenChange(val)
  }

  // Quando seleciona produto, preenche valores padrão
  function handleSelectProduct(id: string) {
    setProdutoId(id)
    if (id !== 'nenhum') {
      const prod = products.find((p) => p.id === id)
      if (prod) {
        if (prod.preco_base && valorTotal === 0) {
          setValorTotal(prod.preco_base)
          setValorRecorrente(prod.preco_base)
        }
        if (prod.comissao_percentual_padrao) {
          setComissaoPercentual(prod.comissao_percentual_padrao)
        }
      }
    }
  }

  function validateStep(): boolean {
    setErrorMsg('')
    if (step === 'cliente') {
      if (!clienteId) {
        setErrorMsg('Selecione um cliente para prosseguir.')
        return false
      }
    }
    if (step === 'condicoes') {
      if (!dataInicio || !dataFim) {
        setErrorMsg('Data de início e data de fim são obrigatórias.')
        return false
      }
      if (new Date(dataFim) <= new Date(dataInicio)) {
        setErrorMsg('A data final deve ser posterior à data inicial.')
        return false
      }
      if (valorTotal <= 0) {
        setErrorMsg('O valor total do contrato deve ser maior que zero.')
        return false
      }
      if (comissaoPercentual < 0 || comissaoPercentual > 100) {
        setErrorMsg('A comissão deve ser um percentual entre 0% e 100%.')
        return false
      }
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    if (step === 'cliente') setStep('produto')
    else if (step === 'produto') setStep('condicoes')
    else if (step === 'condicoes') setStep('revisao')
  }

  function handlePrev() {
    setErrorMsg('')
    if (step === 'produto') setStep('cliente')
    else if (step === 'condicoes') setStep('produto')
    else if (step === 'revisao') setStep('condicoes')
  }

  async function handleFinalSubmit() {
    if (!validateStep()) return
    setLoading(true)
    try {
      const comissao_valor = Math.round(valorTotal * (comissaoPercentual / 100) * 100) / 100
      await onSave({
        cliente_id: clienteId,
        produto_id: produtoId !== 'nenhum' ? produtoId : undefined,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        valor_total: valorTotal,
        valor_recorrente: valorRecorrente || valorTotal,
        periodicidade,
        status,
        venda_id: vendaId !== 'nenhuma' ? vendaId : undefined,
        comissao_percentual: comissaoPercentual,
        comissao_valor,
        observacoes: observacoes.trim() || undefined,
        anexo_url: anexoUrl.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const selectedClient = contacts.find((c) => c.id === clienteId)
  const selectedProduct = products.find((p) => p.id === produtoId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[620px] border-[#e2e8f0] bg-white p-5">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#1e293b]">
            {contract ? 'Editar Contrato' : 'Novo Contrato (em Etapas)'}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#64748b]">
            Etapa:{' '}
            {step === 'cliente'
              ? '1 de 4 • Seleção do Cliente'
              : step === 'produto'
                ? '2 de 4 • Produto / Serviço'
                : step === 'condicoes'
                  ? '3 de 4 • Condições Financeiras & Vigência'
                  : '4 de 4 • Revisão Final'}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de etapas Linear */}
        <div className="mt-2 flex items-center justify-between border-b border-[#e2e8f0] pb-2 text-[11px] font-medium text-[#64748b]">
          {(['cliente', 'produto', 'condicoes', 'revisao'] as Step[]).map((s, idx) => {
            const isCurrent = step === s
            const isDone =
              (s === 'cliente' && step !== 'cliente') ||
              (s === 'produto' && (step === 'condicoes' || step === 'revisao')) ||
              (s === 'condicoes' && step === 'revisao')

            return (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isCurrent
                      ? 'bg-amber-600 text-white'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#e2e8f0] text-[#64748b]',
                  )}
                >
                  {isDone ? <Check className="size-3" /> : idx + 1}
                </span>
                <span className={cn('capitalize', isCurrent && 'font-semibold text-[#0f172a]')}>
                  {s}
                </span>
                {idx < 3 && <ChevronRight className="size-3 text-[#cbd5e1]" />}
              </div>
            )
          })}
        </div>

        {errorMsg && (
          <div className="mt-2 rounded bg-rose-50 p-2 text-[11px] font-medium text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-3 min-h-[220px]">
          {/* ETAPA 1: CLIENTE */}
          {step === 'cliente' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#475569]">
                  Selecione o Cliente (Contato / Empresa) *
                </label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="h-9 text-[12px]">
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

              {selectedClient && (
                <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 text-[12px] text-[#475569]">
                  <p className="font-semibold text-[#0f172a]">{selectedClient.name}</p>
                  <p>Empresa: {selectedClient.company || '—'}</p>
                  <p>E-mail: {selectedClient.email || '—'}</p>
                  <p>Telefone: {selectedClient.phone || '—'}</p>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2: PRODUTO */}
          {step === 'produto' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#475569]">
                  Produto / Serviço Vinculado
                </label>
                <Select value={produtoId} onValueChange={handleSelectProduct}>
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum / Contrato Personalizado</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} — R$ {p.preco_base || 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 text-[12px] text-[#475569]">
                  <p className="font-semibold text-[#0f172a]">{selectedProduct.nome}</p>
                  <p>{selectedProduct.descricao || 'Sem descrição cadastrada.'}</p>
                  <p className="mt-1 font-mono text-[11px] text-amber-700">
                    Preço Base: R$ {selectedProduct.preco_base || 0} • Comissão sugerida:{' '}
                    {selectedProduct.comissao_percentual_padrao || 0}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: CONDIÇÕES */}
          {step === 'condicoes' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#475569]">Data Início *</label>
                  <Input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#475569]">Data Fim *</label>
                  <Input
                    type="date"
                    required
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MoneyInput label="Valor Total *" value={valorTotal} onChange={setValorTotal} />
                <MoneyInput
                  label="Valor Recorrente"
                  value={valorRecorrente}
                  onChange={setValorRecorrente}
                />
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#475569]">Periodicidade</label>
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

              <div className="grid grid-cols-3 gap-3">
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
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#475569]">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#475569]">Vincular a Venda</label>
                  <Select value={vendaId} onValueChange={setVendaId}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      {sales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.numero} (R$ {s.valor_liquido})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: REVISÃO */}
          {step === 'revisao' && (
            <div className="space-y-3">
              <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 text-[12px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Cliente:</span>
                  <span className="font-semibold text-[#0f172a]">
                    {selectedClient?.name}{' '}
                    {selectedClient?.company ? `(${selectedClient.company})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Produto:</span>
                  <span className="font-medium text-[#0f172a]">
                    {selectedProduct?.nome || 'Personalizado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Período de Vigência:</span>
                  <span className="font-medium text-[#0f172a]">
                    {new Date(dataInicio).toLocaleDateString('pt-BR')} até{' '}
                    {new Date(dataFim).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Valor Total:</span>
                  <span className="font-mono font-semibold text-[#0f172a]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      valorTotal,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Periodicidade / Status:</span>
                  <span className="capitalize text-[#0f172a]">
                    {periodicidade} • {status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Comissão Estimada:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {comissaoPercentual}% (
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      valorTotal * (comissaoPercentual / 100),
                    )}
                    )
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#475569]">
                  Link do Anexo do Contrato (Drive, PDF, DocuSign)
                </label>
                <Input
                  placeholder="https://..."
                  value={anexoUrl}
                  onChange={(e) => setAnexoUrl(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#475569]">Observações Finais</label>
                <Textarea
                  placeholder="Notas internas..."
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="resize-none text-[12px]"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between gap-2 border-t border-[#f1f5f9] pt-3">
          <div>
            {step !== 'cliente' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={loading}
                className="h-8 border-[#e2e8f0] text-[12px]"
              >
                Voltar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 border-[#e2e8f0] text-[12px]"
            >
              Cancelar
            </Button>

            {step !== 'revisao' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
              >
                Avançar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700"
              >
                {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
                {contract ? 'Salvar Alterações' : 'Concluir & Criar Contrato'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
