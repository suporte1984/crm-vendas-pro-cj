import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Cloud, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChannelTypeSelectionPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Botão Voltar + Título */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/channels')}
          className="size-8 p-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Criar conexão</h1>
      </div>

      {/* Caixa de Escolha do Tipo de Conexão (idêntica à captura 2) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-[15px] font-semibold text-foreground">Escolha o tipo de conexão</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: WhatsApp */}
          <button
            onClick={() => navigate('/channels/new/form?tipo=whatsapp')}
            className="group relative rounded-xl border border-border bg-card p-5 text-left transition hover:border-emerald-500 hover:shadow-md focus:outline-none flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <MessageCircle className="size-5" />
                </div>
                <h3 className="font-semibold text-[15px] text-foreground group-hover:text-emerald-600 transition">
                  WhatsApp
                </h3>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Conecte seu WhatsApp ao sistema. Semelhante à conexão com WhatsApp Web.
              </p>
            </div>
          </button>

          {/* Card 2: WhatsApp Oficial (Cloud API) */}
          <button
            onClick={() => navigate('/channels/new/form?tipo=whatsapp_cloud')}
            className="group relative rounded-xl border border-border bg-card p-5 text-left transition hover:border-emerald-500 hover:shadow-md focus:outline-none flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Cloud className="size-5" />
                </div>
                <h3 className="font-semibold text-[15px] text-foreground group-hover:text-emerald-600 transition">
                  WhatsApp Oficial (Cloud API)
                </h3>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Integração oficial com a API do WhatsApp Business Cloud da Meta.
              </p>
            </div>
          </button>

          {/* Card 3: Instagram */}
          <button
            onClick={() => navigate('/channels/new/form?tipo=instagram')}
            className="group relative rounded-xl border border-border bg-card p-5 text-left transition hover:border-pink-500 hover:shadow-md focus:outline-none flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-pink-500/10 text-pink-600">
                  <Instagram className="size-5" />
                </div>
                <h3 className="font-semibold text-[15px] text-foreground group-hover:text-pink-600 transition">
                  Instagram
                </h3>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Integração com Direct Messages do Instagram via Meta Graph API.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
