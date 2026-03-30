export function exportarCSV(dados, nomeArquivo) {
  if (!dados.length) return

  const cabecalho = Object.keys(dados[0])
  const linhas = dados.map(row =>
    cabecalho.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )

  const csv = [cabecalho.join(','), ...linhas].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
