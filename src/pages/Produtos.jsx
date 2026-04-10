import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const FORM_VAZIO = { nome: '', categoria: 'agua', marca: '', preco: '', estoque: '' }

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const { toast, mostrar, fechar } = useToast()

  async function carregar() {
    const { data } = await supabase.from('produtos').select('*').order('categoria').order('nome')
    setProdutos(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    const dados = {
      nome: form.nome,
      categoria: form.categoria,
      marca: form.categoria === 'agua' ? form.marca : null,
      preco: parseFloat(form.preco),
      estoque: parseInt(form.estoque) || 0,
    }

    if (editando) {
      const { error } = await supabase.from('produtos').update(dados).eq('id', editando)
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      mostrar('Produto atualizado!')
      setEditando(null)
    } else {
      const { error } = await supabase.from('produtos').insert([dados])
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      mostrar('Produto cadastrado!')
    }

    setForm(FORM_VAZIO)
    await carregar()
    setLoading(false)
  }

  function iniciarEdicao(p) {
    setEditando(p.id)
    setForm({ nome: p.nome, categoria: p.categoria, marca: p.marca || '', preco: p.preco.toString(), estoque: p.estoque?.toString() || '0' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditando(null)
    setForm(FORM_VAZIO)
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('produtos').update({ ativo: !ativo }).eq('id', id)
    await carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    await carregar()
    mostrar('Produto excluído!', 'info')
  }

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  const TabelaProduto = ({ lista, titulo, cor, icone }) => (
    <div className="card p-0 overflow-x-auto">
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${cor}`}>
        <span className="text-lg">{icone}</span>
        <span className="font-semibold text-sm">{titulo}</span>
        <span className="ml-auto text-xs opacity-60">{lista.length} produto(s)</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="p-4 text-left">Nome</th>
            {lista[0]?.categoria === 'agua' && <th className="p-4 text-left">Marca</th>}
            <th className="p-4 text-left">Preço</th>
            <th className="p-4 text-left">Estoque</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.map(p => (
            <tr key={p.id} className={`table-row ${editando === p.id ? 'bg-blue-50' : ''}`}>
              <td className="p-4 font-medium">{p.nome}</td>
              {p.categoria === 'agua' && <td className="p-4 text-gray-500">{p.marca || '—'}</td>}
              <td className="p-4 font-semibold text-emerald-600">R$ {p.preco.toFixed(2)}</td>
              <td className="p-4 font-bold text-blue-700">{p.estoque || 0} un.</td>
              <td className="p-4">
                <button onClick={() => toggleAtivo(p.id, p.ativo)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {p.ativo ? '✅ Ativo' : '⏸ Inativo'}
                </button>
              </td>
              <td className="p-4">
                <div className="flex gap-3">
                  <button onClick={() => iniciarEdicao(p)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition">✏️ Editar</button>
                  <button onClick={() => excluir(p.id)} className="btn-danger">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={fechar} />}

      <div>
        <h2 className="text-2xl font-bold text-blue-800">📦 Mercadorias</h2>
        <p className="text-gray-500 text-sm mt-1">Cadastre os produtos disponíveis para venda</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-700">{produtos.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total de Produtos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-500">{aguas.length}</p>
          <p className="text-gray-500 text-xs mt-1">Águas</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{gases.length}</p>
          <p className="text-gray-500 text-xs mt-1">Tipos de Gás</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">
          {editando ? '✏️ Editando Produto' : 'Novo Produto'}
        </h3>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1 flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, categoria: 'agua' })}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.categoria === 'agua' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
              💧 Água
            </button>
            <button type="button" onClick={() => setForm({ ...form, categoria: 'gas' })}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.categoria === 'gas' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'}`}>
              🔥 Gás
            </button>
          </div>

          <input required placeholder="Nome do produto" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })} className="input" />

          {form.categoria === 'agua'
            ? <input placeholder="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="input" />
            : <div className="input bg-gray-50 text-gray-400 flex items-center text-sm">Gás — sem marca</div>}

          <input type="number" step="0.01" required placeholder="Preço (R$)" value={form.preco}
            onChange={e => setForm({ ...form, preco: e.target.value })} className="input" />

          <input type="number" min="0" placeholder="Estoque" value={form.estoque}
            onChange={e => setForm({ ...form, estoque: e.target.value })} className="input" />

          <button type="submit" disabled={loading}
            className={`col-span-2 sm:col-span-3 ${editando ? 'btn-success' : 'btn-primary'}`}>
            {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Adicionar Produto'}
          </button>
          {editando && (
            <button type="button" onClick={cancelar}
              className="col-span-2 sm:col-span-1 border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-4 rounded-xl transition text-sm font-semibold">
              Cancelar
            </button>
          )}
        </form>
      </div>

      {aguas.length > 0 && <TabelaProduto lista={aguas} titulo="Água Mineral" icone="💧" cor="bg-blue-50 border-blue-100 text-blue-800" />}
      {gases.length > 0 && <TabelaProduto lista={gases} titulo="Gás de Cozinha" icone="🔥" cor="bg-orange-50 border-orange-100 text-orange-700" />}
      {produtos.length === 0 && <div className="card text-center text-gray-400 py-10">Nenhum produto cadastrado ainda</div>}
    </div>
  )
}

