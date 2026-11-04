import { useState, useEffect } from 'react'
import {
  ExternalLink,
  Info,
  KeyRound,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getMetaCredentialsStatus } from '@/services/channels'
import type { MetaCredentialsStatus } from '@/types/channels'

export function MetaCredentialsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<MetaCredentialsStatus | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedVerify, setCopiedVerify] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)

  useEffect(() => {
    if (open) {
      loadStatus()
    }
  }, [open])

  async function loadStatus() {
    setLoading(true)
    try {
      const data = await getMetaCredentialsStatus()
      setStatus(data)
    } catch {
      // Ignora erro em modo offline
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(text: string, type: 'url' | 'verify') {
    navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedVerify(true)
      setTimeout(() => setCopiedVerify(false), 2000)
    }
    toast({
      title: 'Copiado para a área de transferência',
      description: text,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">
                Configuração da API Oficial da Meta (WhatsApp & Instagram)
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Status das chaves oficiais e instruções para vincular seu aplicativo da Meta
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0">
            ✕
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Alerta de status geral */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-[13px] text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-2.5">
              <Info className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Modo de Teste / Aguardando Segredos</p>
                <p className="text-[12px] mt-0.5 opacity-90">
                  Enquanto as chaves da Meta não forem configuradas no painel de segredos do
                  projeto, você pode criar canais, receber simulações e responder pelo chat. As
                  mensagens enviadas ficarão com status{' '}
                  <span className="font-mono font-bold">simulada</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Webhook URL e Verify Token */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <h3 className="text-[13px] font-semibold text-foreground">
              Dados para cadastrar no Meta for Developers
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  URL de Retorno (Callback URL / Webhook)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value={
                      status?.webhook_url ||
                      'https://crm-estilo-linear-clone-2c246.shrd01.internal.goskip.dev/backend/v1/channels/meta/webhook'
                    }
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[12px] text-foreground focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopy(
                        status?.webhook_url ||
                          'https://crm-estilo-linear-clone-2c246.shrd01.internal.goskip.dev/backend/v1/channels/meta/webhook',
                        'url',
                      )
                    }
                    className="gap-1.5 text-[12px]"
                  >
                    {copiedUrl ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    Copiar
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Token de Verificação (Verify Token padrão)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value="adapta_meta_webhook_secret"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[12px] text-foreground focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('adapta_meta_webhook_secret', 'verify')}
                    className="gap-1.5 text-[12px]"
                  >
                    {copiedVerify ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Status dos segredos esperados */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">
              Segredos Esperados no Backend
            </h3>
            <div className="divide-y divide-border text-[12px]">
              {status?.expected_secrets?.map((s) => (
                <div key={s.name} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{s.name}</span>
                      {s.present ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Configurado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <XCircle className="size-3 text-amber-500" /> Não detectado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-[12px]">
                  {loading ? 'Carregando segredos...' : 'Verificando status das variáveis...'}
                </p>
              )}
            </div>
          </div>

          {/* Guia passo a passo */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setGuideOpen(!guideOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left text-[13px] font-semibold text-foreground hover:bg-muted/50 transition"
            >
              <span>Passo a Passo: Como criar seu App no Meta for Developers</span>
              {guideOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {guideOpen && (
              <div className="p-4 pt-1 border-t border-border text-[12px] text-muted-foreground space-y-2.5 leading-relaxed">
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    Acesse{' '}
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      Meta for Developers <ExternalLink className="size-3" />
                    </a>{' '}
                    e crie um aplicativo do tipo <strong>Empresa (Business)</strong>.
                  </li>
                  <li>
                    No painel do app, adicione o produto <strong>WhatsApp</strong> e/ou{' '}
                    <strong>Instagram Graph API</strong>.
                  </li>
                  <li>
                    Na seção <strong>WhatsApp &gt; Início Rápido</strong>, copie o{' '}
                    <em>Token de Acesso Temporário ou crie um Token de Sistema Permanente</em> no
                    Meta Business Manager com permissão <code>whatsapp_business_messaging</code>.
                  </li>
                  <li>
                    Copie também o <strong>ID do Número de Telefone</strong> (Phone Number ID).
                  </li>
                  <li>
                    Na seção <strong>Configuração &gt; Webhooks</strong> do WhatsApp, cole a{' '}
                    <strong>URL de Retorno</strong> acima e o <strong>Token de Verificação</strong>.
                    Assine o campo <code>messages</code>.
                  </li>
                  <li>
                    Cadastre os valores nos Segredos do backend via painel Skip Cloud ou solicite ao
                    administrador.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-[12px]">
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={loadStatus}
            disabled={loading}
            className="text-[12px] bg-primary text-primary-foreground"
          >
            {loading ? 'Verificando...' : 'Atualizar Status'}
          </Button>
        </div>
      </div>
    </div>
  )
}
