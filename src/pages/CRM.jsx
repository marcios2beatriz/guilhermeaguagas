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

export default function CRM() {
  const [dados, setDados] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, telefone, bairro, saldo_fiado')
        .order('nome')

      const { data: vendas } = await supabase
        .from('vendas')
        .select('cliente_id, total, created_at')
        .not('cliente_id', 'is', null)

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

      // Ordena por prioridade (mais críticos primeiro)
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
      <div>
        <h2 className="text-2xl font-bold text-blue-800">📈 CRM</h2>
        <p className="text-gray-500 text-sm mt-1">Acompanhe o relacionamento com seus clientes</p>
      </div>

      {/* Stats */}
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

      {/* Filtros */}
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

      {/* Tabela */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-left">Bairro</th>
              <th className="p-4 text-left">Compras</th>
              <th className="p-4 text-left">Total Gasto</th>
              <th className="p-4 text-left">Última Compra</th>
              <th className="p-4 text-left">Fiado</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} className="table-row">
                <td className="p-4 font-medium whitespace-nowrap">{c.nome}</td>
                <td className="p-4 text-gray-500 whitespace-nowrap">{c.bairro || '—'}</td>
                <td className="p-4 text-center font-bold text-blue-700">{c.count}</td>
                <td className="p-4 font-semibold text-emerald-600 whitespace-nowrap">
                  R$ {c.total.toFixed(2)}
                </td>
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
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhum cliente neste filtro</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
