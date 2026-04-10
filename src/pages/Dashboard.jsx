import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonCard } from '../components/Skeleton'

function Card({ title, value, sub, color = 'text-blue-700', bg = 'bg-white' }) {
  return (
    <div className={`card text-center ${bg}`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-600 text-sm font-semibold mt-1">{title}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [vendas, setVendas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [fiado, setFiado] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function carregar() {
      const [{ data: v }, { data: p }, { data: c }] = await Promise.all([
        supabase.from('vendas').select('total, created_at, fiado'),
        supabase.from('produtos').select('nome, categoria, marca, estoque, preco, ativo').eq('ativo', true),
        supabase.from('clientes').select('saldo_fiado'),
      ])
      setVendas(v || [])
      setProdutos(p || [])
      const totalFiado = (c || []).reduce((acc, cl) => acc + (cl.saldo_fiado || 0), 0)
      setFiado(totalFiado)
      setClientes(c || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = new Date().toDateString()
  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()

  const vendasHoje = vendas.filter(v => new Date(v.created_at).toDateString() === hoje)
  const vendasMes = vendas.filter(v => {
    const d = new Date(v.created_at)
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  })

  const totalHoje = vendasHoje.reduce((acc, v) => acc + v.total, 0)
  const totalMes = vendasMes.reduce((acc, v) => acc + v.total, 0)
  const totalGeral = vendas.reduce((acc, v) => acc + v.total, 0)

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  const estoqueAguaTotal = aguas.reduce((acc, p) => acc + (p.estoque || 0), 0)
  const estoqueGasTotal = gases.reduce((acc, p) => acc + (p.estoque || 0), 0)

  if (loading) return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-48" />
        <div className="flex gap-2"><div className="skeleton h-10 w-32" /><div className="skeleton h-10 w-32" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  const alertasEstoque = produtos.filter(p =>
    (p.categoria === 'agua' && p.estoque <= 5) || (p.categoria === 'gas' && p.estoque <= 3)
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">📊 Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Visão geral do negócio</p>
        </div>
        {/* Atalhos rápidos */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/vendas')}
            className="btn-primary py-2 px-4 text-sm w-auto">
            + Nova Venda
          </button>
          <button onClick={() => navigate('/clientes')}
            className="bg-white border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-bold py-2 px-4 rounded-xl transition text-sm">
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Alertas de estoque baixo */}
      {alertasEstoque.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <p className="text-red-700 font-bold text-sm flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 pulse-alert"></span>
            ⚠️ Estoque baixo — reposição necessária
          </p>
          <div className="flex flex-wrap gap-2">
            {alertasEstoque.map(p => (
              <span key={p.id} className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full pulse-alert">
                {p.nome}{p.marca ? ` (${p.marca})` : ''} — {p.estoque} un.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vendas */}
      <div>
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Vendas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card title="Vendas Hoje" value={`R$ ${totalHoje.toFixed(2)}`} sub={`${vendasHoje.length} pedido(s)`} color="text-blue-700" />
          <Card title="Vendas do Mês" value={`R$ ${totalMes.toFixed(2)}`} sub={`${vendasMes.length} pedido(s)`} color="text-blue-600" />
          <Card title="Vendas Total" value={`R$ ${totalGeral.toFixed(2)}`} sub={`${vendas.length} pedido(s)`} color="text-blue-500" />
          <Card title="Fiado a Receber" value={`R$ ${fiado.toFixed(2)}`} sub={`${clientes.filter(c => c.saldo_fiado > 0).length} cliente(s)`} color="text-red-500" />
        </div>
      </div>

      {/* Estoque */}
      <div>
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Estoque</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card title="Galões de Água" value={estoqueAguaTotal} sub="unidades em estoque" color={estoqueAguaTotal <= 5 ? 'text-red-500' : 'text-blue-600'} />
          <Card title="Botijões de Gás" value={estoqueGasTotal} sub="unidades em estoque" color={estoqueGasTotal <= 3 ? 'text-red-500' : 'text-orange-500'} />
        </div>
      </div>

      {/* Detalhes estoque água */}
      {aguas.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <span>💧</span>
            <span className="font-semibold text-blue-800 text-sm">Estoque — Água Mineral</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="p-4 text-left">Produto</th>
                <th className="p-4 text-left">Marca</th>
                <th className="p-4 text-left">Preço</th>
                <th className="p-4 text-left">Estoque</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {aguas.map(p => (
                <tr key={p.nome + p.marca} className="table-row">
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4 text-gray-500">{p.marca || '—'}</td>
                  <td className="p-4 text-emerald-600 font-semibold">R$ {p.preco.toFixed(2)}</td>
                  <td className="p-4 font-bold">{p.estoque || 0} un.</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(p.estoque || 0) <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(p.estoque || 0) <= 5 ? '⚠️ Baixo' : '✅ OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalhes estoque gás */}
      {gases.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
            <span>🔥</span>
            <span className="font-semibold text-orange-700 text-sm">Estoque — Gás de Cozinha</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="p-4 text-left">Produto</th>
                <th className="p-4 text-left">Preço</th>
                <th className="p-4 text-left">Estoque</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {gases.map(p => (
                <tr key={p.nome} className="table-row">
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4 text-emerald-600 font-semibold">R$ {p.preco.toFixed(2)}</td>
                  <td className="p-4 font-bold">{p.estoque || 0} un.</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(p.estoque || 0) <= 3 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(p.estoque || 0) <= 3 ? '⚠️ Baixo' : '✅ OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


