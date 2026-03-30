import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Historico() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef()

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
    const conteudo = printRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html>
        <head>
          <title>Histórico — ${clienteSelecionado.nome}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 24px; }
            h1 { font-size: 20px; color: #1e40af; margin-bottom: 4px; }
            .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
            .info { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
            .info p { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #dbeafe; color: #1e40af; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: bold; background: #f0fdf4; }
            .fiado { color: #dc2626; font-weight: bold; }
            .pago { color: #16a34a; }
            .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>${conteudo}</body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print(); janela.close() }, 300)
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

          {/* Conteúdo imprimível */}
          <div ref={printRef}>
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
