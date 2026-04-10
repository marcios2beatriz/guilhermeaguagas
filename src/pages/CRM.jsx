import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function diasDesde(data) {
  if (!data) return null
  return Math.floor((new Date() - new Date(data)) / (1000 * 60 * 60 * 24))
}

function statusAtividade(dias) {
  if (dias === null) return { label: 'Nunca comprou', cor: 'bg-gray-100 text-gray-500', prioridade: 4 }
  if (dias <= 7)     return { label: 'Ativo', cor: 'bg-emerald-100 text-emerald-700', prioridade: 1 }
  if (dias <= 30)    return { label: `${dias}d sem comprar`, cor: 'bg-yellow-100 text-yellow-700', prioridade: 2 }
  if (dias <= 60)    return { label: `${dias}d sem comprar`, cor: 'bg-orange-100 text-orange-700', prioridade: 3 }
  return { label: `${dias}d sem comprar`, cor: 'bg-red-100 text-red-700', prioridade: 4 }
}

function Modal({ cliente, onClose }) {
  if (!cliente) return null

  const tel = cliente.telefone?.replace(/\D/g, '') || ''
  const endParts = [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro].filter(Boolean)
  const endereco = endParts.join(', ') || '—'

  function abrirWhatsApp() {
    const msg = `Olá ${cliente.nome}! Tudo bem? 😊\n\nPassando para saber se você precisa de água ou gás. Estamos à disposição!\n\n_Guilherme Água e Gás — (83) 98666-6562_`
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function ligar() {
    window.open(`tel:${cliente.telefone}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-blue-800">{cliente.nome}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cliente.status.cor}`}>
              {cliente.status.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {/* Dados */}
        <div className="grid grid-cols-2 gap-4 bg-blue-50 rounded-2xl p-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Telefone</p>
            <p className="font-semibold text-gray-800">{cliente.telefone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Bairro</p>
            <p className="font-semibold text-gray-800">{cliente.bairro || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Endereço</p>
            <p className="font-semibold text-gray-800">{endereco}</p>
          </div>
          {cliente.referencia && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Referência</p>
              <p className="font-semibold text-gray-800">{cliente.referencia}</p>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-blue-700">{cliente.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">Compras</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-lg font-bold text-emerald-600">R$ {cliente.total.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Gasto</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className={`text-lg font-bold ${cliente.saldo_fiado > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              R$ {(cliente.saldo_fiado || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Fiado</p>
          </div>
        </div>

        {cliente.ultima && (
          <p className="text-xs text-gray-400 text-center">
            Última compra: {new Date(cliente.ultima).toLocaleDateString('pt-BR')}
          </p>
        )}

        {/* Botões de contato */}
        <div className="flex gap-3">
          {tel && (
            <button onClick={abrirWhatsApp}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 text-sm">
              📲 WhatsApp
            </button>
          )}
          {cliente.telefone && (
            <button onClick={ligar}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 text-sm">
              📞 Ligar
            </button>
          )}
          {!cliente.telefone && (
            <p className="flex-1 text-center text-gray-400 text-sm py-3">Sem telefone cadastrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CRM() {
  const [dados, setDados] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [clienteModal, setClienteModal] = useState(null)

  useEffect(() => {
    async function carregar() {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, telefone, bairro, endereco, numero, complemento, referencia, saldo_fiado')
        .order('nome')

      const { data: vendas } = await supabase
        .from('vendas').select('cliente_id, total, created_at').not('cliente_id', 'is', null)

      const mapa = {}
      for (const v of vendas || []) {
        if (!mapa[v.cliente_id]) mapa[v.cliente_id] = { total: 0, count: 0, ultima: null }
        mapa[v.cliente_id].total += v.total
        mapa[v.cliente_id].count += 1
        const d = new Date(v.created_at)
        if (!mapa[v.cliente_id].ultima || d > new Date(mapa[v.cliente_id].ultima)) {
          mapa[v.cliente_id].ultima = v.created_at
        }
      }

      const resultado = (clientes || []).map(c => {
        const hist = mapa[c.id] || { total: 0, count: 0, ultima: null }
        const dias = diasDesde(hist.ultima)
        const status = statusAtividade(dias)
        return { ...c, ...hist, dias, status }
      })

      resultado.sort((a, b) => b.status.prioridade - a.status.prioridade)
      setDados(resultado)
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = dados.filter(c => {
    if (filtro === 'ativos') return c.dias !== null && c.dias <= 7
    if (filtro === 'alerta') return c.dias !== null && c.dias > 7 && c.dias <= 30
    if (filtro === 'risco') return c.dias === null || c.dias > 30
    return true
  })

  const ativos = dados.filter(c => c.dias !== null && c.dias <= 7).length
  const alerta = dados.filter(c => c.dias !== null && c.dias > 7 && c.dias <= 30).length
  const risco  = dados.filter(c => c.dias === null || c.dias > 30).length

  if (loading) return <div className="text-center text-gray-400 py-20">Carregando...</div>

  return (
    <div className="space-y-6">
      <Modal cliente={clienteModal} onClose={() => setClienteModal(null)} />

      <div>
        <h2 className="text-2xl font-bold text-blue-800">📈 CRM</h2>
        <p className="text-gray-500 text-sm mt-1">Clique em um cliente para ver detalhes e entrar em contato</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-700">{dados.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total Clientes</p>
        </div>
        <div className="card text-center cursor-pointer" onClick={() => setFiltro('ativos')}>
          <p className="text-3xl font-bold text-emerald-600">{ativos}</p>
          <p className="text-gray-500 text-xs mt-1">🟢 Ativos (7d)</p>
        </div>
        <div className="card text-center cursor-pointer" onClick={() => setFiltro('alerta')}>
          <p className="text-3xl font-bold text-yellow-600">{alerta}</p>
          <p className="text-gray-500 text-xs mt-1">🟡 Atenção (8-30d)</p>
        </div>
        <div className="card text-center cursor-pointer" onClick={() => setFiltro('risco')}>
          <p className="text-3xl font-bold text-red-500">{risco}</p>
          <p className="text-gray-500 text-xs mt-1">🔴 Em risco (+30d)</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'ativos', label: '🟢 Ativos' },
          { key: 'alerta', label: '🟡 Atenção' },
          { key: 'risco', label: '🔴 Em risco' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${filtro === f.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-left">Telefone</th>
              <th className="p-4 text-left">Bairro</th>
              <th className="p-4 text-left">Compras</th>
              <th className="p-4 text-left">Total Gasto</th>
              <th className="p-4 text-left">Última Compra</th>
              <th className="p-4 text-left">Fiado</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Contato</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} className="table-row cursor-pointer hover:bg-blue-50" onClick={() => setClienteModal(c)}>
                <td className="p-4 font-medium whitespace-nowrap text-blue-700">{c.nome}</td>
                <td className="p-4 text-gray-500 whitespace-nowrap">{c.telefone || '—'}</td>
                <td className="p-4 text-gray-500 whitespace-nowrap">{c.bairro || '—'}</td>
                <td className="p-4 text-center font-bold text-blue-700">{c.count}</td>
                <td className="p-4 font-semibold text-emerald-600 whitespace-nowrap">R$ {c.total.toFixed(2)}</td>
                <td className="p-4 text-gray-500 whitespace-nowrap">
                  {c.ultima ? new Date(c.ultima).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-4 whitespace-nowrap">
                  {c.saldo_fiado > 0
                    ? <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600 font-semibold">R$ {c.saldo_fiado.toFixed(2)}</span>
                    : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.status.cor}`}>
                    {c.status.label}
                  </span>
                </td>
                <td className="p-4" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {c.telefone && (
                      <button onClick={() => {
                        const tel = c.telefone.replace(/\D/g, '')
                        const msg = `Olá ${c.nome}! Tudo bem? 😊\n\nPassando para saber se você precisa de água ou gás!\n\n_Guilherme Água e Gás — (83) 98666-6562_`
                        window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-lg transition whitespace-nowrap">
                        📲
                      </button>
                    )}
                    <button onClick={() => setClienteModal(c)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg transition whitespace-nowrap">
                      Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-gray-400">Nenhum cliente neste filtro</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

