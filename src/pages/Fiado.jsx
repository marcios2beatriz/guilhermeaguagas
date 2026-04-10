import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Fiado() {
  const [clientes, setClientes] = useState([])
  const [pagamento, setPagamento] = useState({ cliente_id: '', valor: '' })
  const [lancamento, setLancamento] = useState({ cliente_id: '', valor: '', descricao: '' })
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('devedores')

  async function carregar() {
    const { data } = await supabase.from('clientes').select('id, nome, saldo_fiado').order('nome')
    setClientes(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function pagar(e) {
    e.preventDefault()
    setLoading(true)
    const valor = parseFloat(pagamento.valor)
    await supabase.rpc('abater_fiado', { p_cliente_id: pagamento.cliente_id, p_valor: valor })
    await supabase.from('fluxo_caixa').insert([{
      descricao: 'Pagamento de fiado',
      tipo: 'entrada',
      valor,
      cliente_id: pagamento.cliente_id,
    }])
    setPagamento({ cliente_id: '', valor: '' })
    await carregar()
    setLoading(false)
    setAba('devedores')
  }

  async function lancarFiado(e) {
    e.preventDefault()
    setLoading(true)
    const valor = parseFloat(lancamento.valor)
    await supabase.rpc('incrementar_fiado', { p_cliente_id: lancamento.cliente_id, p_valor: valor })
    await supabase.from('vendas').insert([{
      cliente_id: lancamento.cliente_id,
      produto: lancamento.descricao,
      quantidade: 1,
      valor_unit: valor,
      total: valor,
      fiado: true,
    }])
    setLancamento({ cliente_id: '', valor: '', descricao: '' })
    await carregar()
    setLoading(false)
    setAba('devedores')
  }

  const totalDevendo = clientes.reduce((acc, c) => acc + (c.saldo_fiado || 0), 0)
  const devedores = clientes.filter(c => c.saldo_fiado > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">📋 Fiado</h2>
        <p className="text-gray-500 text-sm mt-1">Controle de saldo devedor dos clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">{devedores.length}</p>
          <p className="text-gray-500 text-xs mt-1">Clientes Devedores</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">R$ {totalDevendo.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">Total a Receber</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'devedores', label: '📋 Devedores' },
          { key: 'lancar', label: '➕ Lançar Fiado' },
          { key: 'pagar', label: '✓ Registrar Pagamento' },
        ].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${aba === a.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Lançar fiado manualmente */}
      {aba === 'lancar' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Lançar Fiado para Cliente</h3>
          <form onSubmit={lancarFiado} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select required value={lancamento.cliente_id}
              onChange={e => setLancamento({ ...lancamento, cliente_id: e.target.value })} className="input">
              <option value="">Selecione o cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.saldo_fiado > 0 ? ` — deve R$ ${c.saldo_fiado.toFixed(2)}` : ''}
                </option>
              ))}
            </select>
            <input placeholder="Descrição (ex: Água 20L)" required value={lancamento.descricao}
              onChange={e => setLancamento({ ...lancamento, descricao: e.target.value })} className="input" />
            <input type="number" step="0.01" required placeholder="Valor (R$)" value={lancamento.valor}
              onChange={e => setLancamento({ ...lancamento, valor: e.target.value })} className="input" />
            <button type="submit" disabled={loading} className="btn-primary sm:col-span-3">
              {loading ? 'Lançando...' : '➕ Lançar Fiado'}
            </button>
          </form>
        </div>
      )}

      {/* Registrar pagamento */}
      {aba === 'pagar' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Registrar Pagamento</h3>
          <form onSubmit={pagar} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select required value={pagamento.cliente_id}
              onChange={e => setPagamento({ ...pagamento, cliente_id: e.target.value })} className="input">
              <option value="">Selecione o cliente</option>
              {devedores.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — R$ {c.saldo_fiado?.toFixed(2)}</option>
              ))}
            </select>
            <input type="number" step="0.01" required placeholder="Valor pago (R$)" value={pagamento.valor}
              onChange={e => setPagamento({ ...pagamento, valor: e.target.value })} className="input" />
            <button type="submit" disabled={loading} className="btn-success">
              {loading ? 'Registrando...' : '✓ Registrar Pagamento'}
            </button>
          </form>
        </div>
      )}

      {/* Tabela devedores */}
      {aba === 'devedores' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Saldo Devedor</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {devedores.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="p-4 font-medium">{c.nome}</td>
                  <td className="p-4 font-bold text-red-500">R$ {(c.saldo_fiado || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                      🔴 Devendo
                    </span>
                  </td>
                </tr>
              ))}
              {devedores.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">Nenhum cliente com fiado em aberto ✅</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


