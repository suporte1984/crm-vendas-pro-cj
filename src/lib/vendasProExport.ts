/**
 * Helpers para exportação em CSV e PDF nativo (HTML print amigável)
 */

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToPrintPdf(title: string, headers: string[], rows: (string | number)[][]) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const tableHeaderHtml = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #e2e8f0; padding: 8px 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; color: #475569;">${h}</th>`,
    )
    .join('')

  const tableRowsHtml = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (c) =>
              `<td style="border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12px; color: #1e293b;">${c ?? '—'}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${title} - Vendas PRO</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 18px; margin-bottom: 4px; font-weight: 600; }
          p.meta { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Exportado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())} • CRM Adapta - Vendas PRO</p>
        <table>
          <thead><tr>${tableHeaderHtml}</tr></thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
