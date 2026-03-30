import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

export default function FluxoCaixa() {
  const [lancamentos, setLancamentos] = useState([])
  const [form, setForm] = useState({ descricao: '', tipo: 'entrada', valor: '' })
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [periodo, setPeriodo] = useState('mes') // hoje, semana, mes, tudo
  const { toast, mostrar, fechar } = useToast()

  async function carregar() {
    const { data } = await supabase.from('fluxo_caixa').select('*, clientes(nome)')
      .order('created_at', { ascending: false }).limit(500)
    setLancamentos(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)

    if (editando) {
      const { error } = await supabase.from('fluxo_caixa').update({
        descricao: form.descricao,
        tipo: form.tipo,
        valor: parseFloat(form.valor),
      }).eq('id', editando)
      if (error) { mostrar('Erro ao editar: ' + error.message, 'erro'); setLoading(false); return }
      setEditando(null)
      mostrar('Lançamento atualizado!')
    } else {
      const { error } = await supabase.from('fluxo_caixa').insert([{
        descricao: form.descricao,
        tipo: form.tipo,
        valor: parseFloat(form.valor),
      }])
      if (error) { mostrar('Erro ao salvar: ' + error.message, 'erro'); setLoading(false); return }
      mostrar('Lançamento registrado!')
    }

    setForm({ descricao: '', tipo: 'entrada', valor: '' })
    await carregar()
    setLoading(false)
  }

  function iniciarEdicao(l) {
    setEditando(l.id)
    setForm({ descricao: l.descricao, tipo: l.tipo, valor: l.valor.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm({ descricao: '', tipo: 'entrada', valor: '' })
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    const { error } = await supabase.from('fluxo_caixa').delete().eq('id', id)
    if (error) { alert('Erro ao excluir: ' + error.message); return }
    await carregar()
  }

  const hoje = new Date()
  const filtrados = lancamentos.filter(l => {
    const d = new Date(l.created_at)
    if (periodo === 'hoje') return d.toDateString() === hoje.toDateString()
    if (periodo === 'semana') return (hoje - d) <= 7 * 24 * 60 * 60 * 1000
    if (periodo === 'mes') return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
    return true
  })

  const entradas = filtrados.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0)
  const saidas = filtrados.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0)
  const saldo = entradas - saidas

  return (
    <div className="space-y-6">
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={fechar} />}
      <div>
        <h2 className="text-2xl font-bold text-blue-800">💰 Fluxo de Caixa</h2>
        <p className="text-gray-500 text-sm mt-1">Controle de entradas e saídas</p>
      </div>

      {/* Filtro de período */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'hoje', label: 'Hoje' },
          { key: 'semana', label: '7 dias' },
          { key: 'mes', label: 'Este mês' },
          { key: 'tudo', label: 'Tudo' },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriodo(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${periodo === p.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-emerald-600">R$ {entradas.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">↑ Total Entradas</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">R$ {saidas.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">↓ Total Saídas</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-red-500'}`}>
            R$ {saldo.toFixed(2)}
          </p>
          <p className="text-gray-500 text-xs mt-1">Saldo Atual</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">
          {editando ? '✏️ Editando Lançamento' : 'Novo Lançamento'}
        </h3>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input required placeholder="Descrição" value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            className="input sm:col-span-2" />
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input">
            <option value="entrada">↑ Entrada</option>
            <option value="saida">↓ Saída</option>
          </select>
          <input type="number" step="0.01" required placeholder="Valor (R$)" value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })} className="input" />
          <button type="submit" disabled={loading}
            className={`sm:col-span-3 ${editando ? 'btn-success' : 'btn-primary'}`}>
            {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Lançar'}
          </button>
          {editando && (
            <button type="button" onClick={cancelarEdicao}
              className="border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-5 rounded-xl transition text-sm font-semibold">
              Cancelar
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Data</th>
              <th className="p-4 text-left">Descrição</th>
              <th className="p-4 text-left">Tipo</th>
              <th className="p-4 text-left">Valor</th>
              <th className="p-4 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(l => (
              <tr key={l.id} className={`table-row ${editando === l.id ? 'bg-blue-50' : ''}`}>
                <td className="p-4 text-gray-400">{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">{l.descricao}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {l.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </span>
                </td>
                <td className={`p-4 font-bold ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                  R$ {l.valor?.toFixed(2)}
                </td>
                <td className="p-4 flex gap-3">
                  <button onClick={() => iniciarEdicao(l)}
                    className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition">
                    ✏️ Editar
                  </button>
                  <button onClick={() => excluir(l.id)} className="btn-danger">
                    🗑️ Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum lançamento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

