import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Historico() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, nome, telefone, bairro, endereco, numero, saldo_fiado').order('nome')
      .then(({ data }) => setClientes(data || []))
  }, [])

  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase()
    return c.nome?.toLowerCase().includes(q) || c.telefone?.includes(q)
  })

  async function selecionarCliente(cliente) {
    setClienteSelecionado(cliente)
    setLoading(true)
    const { data } = await supabase
      .from('vendas')
      .select('*, produtos(nome, categoria)')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoading(false)
  }

  function imprimir() {
    const c = clienteSelecionado
    const dataEmissao = new Date().toLocaleDateString('pt-BR')
    const horaEmissao = new Date().toLocaleTimeString('pt-BR')

    const linhas = historico.map((v, i) => `
      <tr class="${i % 2 === 0 ? 'par' : ''}">
        <td>${new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
        <td>${v.produtos?.nome || v.produto || '—'}</td>
        <td class="center">${v.quantidade}</td>
        <td class="right">R$ ${v.valor_unit?.toFixed(2)}</td>
        <td class="center">
          ${v.desconto_valor > 0
            ? `<span class="badge-desc">${v.desconto_tipo === 'percentual' ? v.desconto_valor + '%' : 'R$ ' + v.desconto_valor.toFixed(2)}</span>`
            : '—'}
        </td>
        <td class="right bold green">R$ ${v.total?.toFixed(2)}</td>
        <td class="center">
          ${v.fiado
            ? '<span class="badge-fiado">Fiado</span>'
            : '<span class="badge-pago">Pago</span>'}
        </td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title>Histórico de Compras — ${c.nome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1f2937; background: #fff; }
          .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }

          /* Cabeçalho */
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #1e40af; margin-bottom: 24px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-icon { font-size: 40px; }
          .logo-text h1 { font-size: 22px; font-weight: 800; color: #1e40af; line-height: 1.1; }
          .logo-text p { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .doc-info { text-align: right; }
          .doc-info .doc-title { font-size: 16px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; }
          .doc-info .doc-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }

          /* Dados do cliente */
          .cliente-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
          .cliente-box h2 { font-size: 13px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
          .cliente-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .cliente-field label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 2px; }
          .cliente-field span { font-size: 13px; font-weight: 600; color: #111827; }
          .fiado-valor { color: #dc2626 !important; }

          /* Resumo */
          .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .resumo-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; text-align: center; }
          .resumo-card .valor { font-size: 20px; font-weight: 800; }
          .resumo-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
          .azul { color: #1e40af; }
          .verde { color: #16a34a; }
          .vermelho { color: #dc2626; }

          /* Tabela */
          .section-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          thead tr { background: #1e40af; color: white; }
          thead th { padding: 9px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
          tbody tr.par { background: #f8fafc; }
          tbody td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: 700; }
          .green { color: #16a34a; }

          /* Badges */
          .badge-fiado { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
          .badge-pago { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
          .badge-desc { background: #fef9c3; color: #92400e; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }

          /* Total */
          .total-row td { background: #f0fdf4; font-weight: 700; font-size: 13px; border-top: 2px solid #16a34a; }

          /* Rodapé */
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-left p { font-size: 11px; color: #6b7280; line-height: 1.6; }
          .footer-right { text-align: right; font-size: 10px; color: #9ca3af; }
          .footer-right .assinatura { border-top: 1px solid #9ca3af; padding-top: 4px; margin-top: 32px; min-width: 180px; }

          @media print {
            .page { padding: 16px 20px; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Cabeçalho -->
          <div class="header">
            <div class="logo-area">
              <div class="logo-icon">💧</div>
              <div class="logo-text">
                <h1>Guilherme Água e Gás</h1>
                <p>Sistema de Gestão Comercial</p>
              </div>
            </div>
            <div class="doc-info">
              <div class="doc-title">Histórico de Compras</div>
              <div class="doc-sub">Emitido em ${dataEmissao} às ${horaEmissao}</div>
            </div>
          </div>

          <!-- Dados do cliente -->
          <div class="cliente-box">
            <h2>Dados do Cliente</h2>
            <div class="cliente-grid">
              <div class="cliente-field"><label>Nome</label><span>${c.nome}</span></div>
              <div class="cliente-field"><label>Telefone</label><span>${c.telefone || '—'}</span></div>
              <div class="cliente-field"><label>Bairro</label><span>${c.bairro || '—'}</span></div>
              <div class="cliente-field"><label>Fiado em aberto</label>
                <span class="${c.saldo_fiado > 0 ? 'fiado-valor' : ''}">R$ ${(c.saldo_fiado || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Resumo -->
          <div class="resumo">
            <div class="resumo-card"><div class="valor azul">${historico.length}</div><div class="label">Total de Compras</div></div>
            <div class="resumo-card"><div class="valor verde">R$ ${totalGasto.toFixed(2)}</div><div class="label">Total Gasto</div></div>
            <div class="resumo-card"><div class="valor vermelho">R$ ${totalFiado.toFixed(2)}</div><div class="label">Total no Fiado</div></div>
          </div>

          <!-- Tabela -->
          <div class="section-title">Detalhamento das Compras</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th class="center">Qtd</th>
                <th class="right">Vlr Unit.</th>
                <th class="center">Desconto</th>
                <th class="right">Total</th>
                <th class="center">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
              ${historico.length > 0 ? `
              <tr class="total-row">
                <td colspan="5" style="text-align:right; color:#374151;">Total Geral:</td>
                <td class="right green">R$ ${totalGasto.toFixed(2)}</td>
                <td></td>
              </tr>` : '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af;">Nenhuma compra registrada</td></tr>'}
            </tbody>
          </table>

          <!-- Rodapé -->
          <div class="footer">
            <div class="footer-left">
              <p><strong>Guilherme Água e Gás</strong></p>
              <p>📞 (83) 98666-6562</p>
            </div>
            <div class="footer-right">
              <div class="assinatura">Assinatura do Responsável</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print(); janela.close() }, 500)
  }

  const totalGasto = historico.reduce((acc, v) => acc + (v.total || 0), 0)
  const totalFiado = historico.filter(v => v.fiado).reduce((acc, v) => acc + (v.total || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">📜 Histórico de Compras</h2>
        <p className="text-gray-500 text-sm mt-1">Consulte o histórico de compras por cliente</p>
      </div>

      {/* Pesquisa */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Pesquisar cliente</h3>
        <input
          placeholder="Digite o nome ou telefone..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setClienteSelecionado(null); setHistorico([]) }}
          className="input mb-3"
        />
        {busca && (
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            {clientesFiltrados.length === 0 && (
              <p className="p-4 text-gray-400 text-sm text-center">Nenhum cliente encontrado</p>
            )}
            {clientesFiltrados.map(c => (
              <button key={c.id} onClick={() => { selecionarCliente(c); setBusca(c.nome) }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-blue-50 last:border-0 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.nome}</p>
                  <p className="text-gray-400 text-xs">{c.telefone || 'Sem telefone'} {c.bairro ? `• ${c.bairro}` : ''}</p>
                </div>
                {c.saldo_fiado > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                    Fiado: R$ {c.saldo_fiado.toFixed(2)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      {clienteSelecionado && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-800">{clienteSelecionado.nome}</h3>
            <button onClick={imprimir}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-md">
              🖨️ Imprimir
            </button>
          </div>

          {/* Conteúdo da tela */}
          <div>
            <h1>Histórico de Compras</h1>
            <p className="sub">Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>

            <div className="info card mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Cliente</p>
                  <p className="font-semibold">{clienteSelecionado.nome}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Telefone</p>
                  <p className="font-semibold">{clienteSelecionado.telefone || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Bairro</p>
                  <p className="font-semibold">{clienteSelecionado.bairro || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Fiado em aberto</p>
                  <p className={`font-bold ${clienteSelecionado.saldo_fiado > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    R$ {(clienteSelecionado.saldo_fiado || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="card text-center">
                <p className="text-2xl font-bold text-blue-700">{historico.length}</p>
                <p className="text-gray-500 text-xs mt-1">Total de Compras</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-emerald-600">R$ {totalGasto.toFixed(2)}</p>
                <p className="text-gray-500 text-xs mt-1">Total Gasto</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-red-500">R$ {totalFiado.toFixed(2)}</p>
                <p className="text-gray-500 text-xs mt-1">Total no Fiado</p>
              </div>
            </div>

            {/* Tabela */}
            {loading ? (
              <p className="text-center text-gray-400 py-8">Carregando...</p>
            ) : (
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="p-4 text-left">Data</th>
                      <th className="p-4 text-left">Produto</th>
                      <th className="p-4 text-left">Qtd</th>
                      <th className="p-4 text-left">Vlr Unit.</th>
                      <th className="p-4 text-left">Desconto</th>
                      <th className="p-4 text-left">Total</th>
                      <th className="p-4 text-left">Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(v => (
                      <tr key={v.id} className="table-row">
                        <td className="p-4 whitespace-nowrap text-gray-500">{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 whitespace-nowrap">{v.produtos?.nome || v.produto || '—'}</td>
                        <td className="p-4">{v.quantidade}</td>
                        <td className="p-4 whitespace-nowrap">R$ {v.valor_unit?.toFixed(2)}</td>
                        <td className="p-4 whitespace-nowrap">
                          {v.desconto_valor > 0
                            ? <span className="text-yellow-600 font-semibold">
                                {v.desconto_tipo === 'percentual' ? `${v.desconto_valor}%` : `R$ ${v.desconto_valor.toFixed(2)}`}
                              </span>
                            : '—'}
                        </td>
                        <td className="p-4 font-bold text-emerald-600 whitespace-nowrap">R$ {v.total?.toFixed(2)}</td>
                        <td className="p-4">
                          {v.fiado
                            ? <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600 font-semibold">Fiado</span>
                            : <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 font-semibold">Pago</span>}
                        </td>
                      </tr>
                    ))}
                    {historico.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma compra registrada</td></tr>
                    )}
                    {historico.length > 0 && (
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={5} className="p-4 text-right text-blue-700">Total geral:</td>
                        <td className="p-4 text-emerald-600">R$ {totalGasto.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="footer mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
              <p className="font-semibold text-gray-500">Guilherme Água e Gás — Sistema de Gestão</p>
              <p>Desenvolvido por Juveniciu's Tech Soluções Automatizadas™</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
