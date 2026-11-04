import { describe, it, expect } from 'vitest'

describe('Formatting WhatsApp markers', () => {
  function applyFormat(text: string, start: number, end: number, prefix: string, suffix = '') {
    const selected = text.substring(start, end)
    if (selected.length > 0) {
      return text.substring(0, start) + prefix + selected + suffix + text.substring(end)
    }
    return text.substring(0, start) + prefix + suffix + text.substring(end)
  }

  it('deve envolver seleção com marcadores de negrito', () => {
    const input = 'Olá cliente, tudo bem?'
    const formatted = applyFormat(input, 4, 11, '*', '*')
    expect(formatted).toBe('Olá *cliente*, tudo bem?')
  })

  it('deve envolver seleção com marcadores de itálico', () => {
    const input = 'mensagem teste'
    const formatted = applyFormat(input, 9, 14, '_', '_')
    expect(formatted).toBe('mensagem _teste_')
  })

  it('deve envolver seleção com marcadores de tachado', () => {
    const input = 'preço antigo'
    const formatted = applyFormat(input, 6, 12, '~', '~')
    expect(formatted).toBe('preço ~antigo~')
  })

  it('deve envolver seleção com marcadores de código', () => {
    const input = 'código aqui'
    const formatted = applyFormat(input, 0, 6, '```', '```')
    expect(formatted).toBe('```código``` aqui')
  })

  it('deve inserir marcadores no cursor quando nada estiver selecionado', () => {
    const input = 'Texto '
    const formatted = applyFormat(input, 6, 6, '*', '*')
    expect(formatted).toBe('Texto **')
  })
})
