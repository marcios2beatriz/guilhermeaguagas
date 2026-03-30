import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState({ nome: '', categoria: 'agua', marca: '', preco: '', estoque: '' })
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const { data } = await supabase.from('produtos').select('*').order('categoria').order('nome')
    setProdutos(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('produtos').insert([{
      nome: form.nome,
      categoria: form.categoria,
      marca: form.categoria === 'agua' ? form.marca : null,
      preco: parseFloat(form.preco),
      estoque: parseInt(form.estoque) || 0,
    }])
    if (error) { alert('Erro ao salvar: ' + error.message); setLoading(false); return }
    setForm({ nome: '', categoria: 'agua', marca: '', preco: '', estoque: '' })
    await carregar()
    setLoading(false)
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('produtos').update({ ativo: !ativo }).eq('id', id)
    await carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    await carregar()
  }

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">📦 Mercadorias</h2>
        <p className="text-gray-500 text-sm mt-1">Cadastre os produtos disponíveis para venda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-700">{produtos.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total de Produtos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-500">{aguas.length}</p>
          <p className="text-gray-500 text-xs mt-1">Águas Cadastradas</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{gases.length}</p>
          <p className="text-gray-500 text-xs mt-1">Tipos de Gás</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">Novo Produto</h3>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Categoria */}
          <div className="col-span-2 sm:col-span-1 flex gap-2">
            <button type="button"
              onClick={() => setForm({ ...form, categoria: 'agua' })}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.categoria === 'agua' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
              💧 Água
            </button>
            <button type="button"
              onClick={() => setForm({ ...form, categoria: 'gas' })}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.categoria === 'gas' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'}`}>
              🔥 Gás
            </button>
          </div>

          <input required placeholder="Nome do produto" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })} className="input" />

          {form.categoria === 'agua' ? (
            <input placeholder="Marca" value={form.marca}
              onChange={e => setForm({ ...form, marca: e.target.value })} className="input" />
          ) : (
            <div className="input bg-gray-50 text-gray-400 flex items-center">Gás — sem marca</div>
          )}

          <input type="number" step="0.01" required placeholder="Preço (R$)" value={form.preco}
            onChange={e => setForm({ ...form, preco: e.target.value })} className="input" />

          <input type="number" min="0" placeholder="Estoque inicial" value={form.estoque}
            onChange={e => setForm({ ...form, estoque: e.target.value })} className="input" />

          <button type="submit" disabled={loading} className="btn-primary col-span-2 sm:col-span-4">
            {loading ? 'Salvando...' : '+ Adicionar Produto'}
          </button>
        </form>
      </div>

      {/* Tabela Água */}
      {aguas.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <span className="text-lg">💧</span>
            <span className="font-semibold text-blue-800 text-sm">Água Mineral</span>
            <span className="ml-auto text-xs text-blue-400">{aguas.length} produto(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Marca</th>
                <th className="p-4 text-left">Preço</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {aguas.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4 text-gray-500">{p.marca || '—'}</td>
                  <td className="p-4 font-semibold text-emerald-600">R$ {p.preco.toFixed(2)}</td>
                  <td className="p-4">
                    <button onClick={() => toggleAtivo(p.id, p.ativo)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {p.ativo ? '✅ Ativo' : '⏸ Inativo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => excluir(p.id)} className="btn-danger">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela Gás */}
      {gases.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-semibold text-orange-700 text-sm">Gás de Cozinha</span>
            <span className="ml-auto text-xs text-orange-400">{gases.length} produto(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Preço</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {gases.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4 font-semibold text-emerald-600">R$ {p.preco.toFixed(2)}</td>
                  <td className="p-4">
                    <button onClick={() => toggleAtivo(p.id, p.ativo)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {p.ativo ? '✅ Ativo' : '⏸ Inativo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => excluir(p.id)} className="btn-danger">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {produtos.length === 0 && (
        <div className="card text-center text-gray-400 py-10">Nenhum produto cadastrado ainda</div>
      )}
    </div>
  )
}

