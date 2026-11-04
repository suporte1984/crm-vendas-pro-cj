import { useState } from 'react'
import { Bold, Italic, Strikethrough, Code, MoreHorizontal, Smile, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface FormattingToolbarProps {
  mode: 'responder' | 'nota_privada'
  onModeChange: (mode: 'responder' | 'nota_privada') => void
  onApplyFormat: (prefix: string, suffix?: string) => void
  onInsertEmoji: (emoji: string) => void
}

const COMMON_EMOJIS = [
  '😊',
  '👍',
  '🙏',
  '❤️',
  '👋',
  '🎯',
  '🔥',
  '🚀',
  '✅',
  '⭐',
  '🤝',
  '💼',
  '📞',
  '💬',
  '🎉',
  '👏',
  '💡',
  '⏰',
  '📅',
  '📍',
  '💰',
  '📊',
  '🛡️',
  '✨',
]

export function FormattingToolbar({
  mode,
  onModeChange,
  onApplyFormat,
  onInsertEmoji,
}: FormattingToolbarProps) {
  const [emojiOpen, setEmojiOpen] = useState(false)

  return (
    <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 bg-muted/30 text-[12px]">
      {/* Botões de Formatação WhatsApp: B, I, S, <\>, ... */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onApplyFormat('*', '*')}
          title="Negrito (*texto*)"
          className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted font-bold transition-colors"
        >
          <Bold className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onApplyFormat('_', '_')}
          title="Itálico (_texto_)"
          className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted italic transition-colors"
        >
          <Italic className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onApplyFormat('~', '~')}
          title="Tachado (~texto~)"
          className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted line-through transition-colors"
        >
          <Strikethrough className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onApplyFormat('```', '```')}
          title="Código (```código```)"
          className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted font-mono transition-colors"
        >
          <Code className="size-3.5" />
        </button>

        {/* Menu "..." com mais opções */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Mais opções de formatação"
              className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 text-[12px]">
            <DropdownMenuItem onClick={() => onApplyFormat('> ')}>
              Citação (&gt; texto)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onApplyFormat('• ')}>
              Lista com marcadores (• item)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onApplyFormat('1. ')}>
              Lista numerada (1. item)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onApplyFormat('`', '`')}>
              Monoespaçado inline (`código`)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Seletor rápido de emojis na barra */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Inserir emoji"
              className="size-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Smile className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 px-1">
              Emojis Frequentes
            </p>
            <div className="grid grid-cols-8 gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onInsertEmoji(emoji)
                    setEmojiOpen(false)
                  }}
                  className="size-7 rounded text-base hover:bg-muted grid place-items-center transition-transform active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Botões de Modo: "Responder" (cliente) e "Mensagem Privada" (nota interna) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onModeChange('responder')}
          className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
            mode === 'responder'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          Responder
        </button>

        <button
          type="button"
          onClick={() => onModeChange('nota_privada')}
          className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1 ${
            mode === 'nota_privada'
              ? 'bg-amber-500 text-white shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
          title="Nota interna da equipe — NÃO será enviada ao cliente"
        >
          <span>Mensagem Privada</span>
          {mode === 'nota_privada' && <Check className="size-3 ml-0.5" />}
        </button>
      </div>
    </div>
  )
}
