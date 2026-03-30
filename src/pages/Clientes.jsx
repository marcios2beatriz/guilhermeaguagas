import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const formVazio = { nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', referencia: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState(formVazio)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    if (editando) {
      const { error } = await supabase.from('clientes').update(form).eq('id', editando)
      if (error) { alert('Erro: ' + error.message); setLoading(false); return }
      setEditando(null)
    } else {
      const { error } = await supabase.from('clientes').insert([form])
      if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    }
    setForm(formVazio)
    await carregar()
    setLoading(false)
  }

  function iniciarEdicao(c) {
    setEditando(c.id)
    setForm({
      nome: c.nome || '',
      telefone: c.telefone || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      bairro: c.bairro || '',
      referencia: c.referencia || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditando(null)
    setForm(formVazio)
  }

  async function excluir(id) {
    if (!confirm('Excluir cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    await carregar()
  }

  const f = (field, placeholder, required = false, span = '') => (
    <input
      placeholder={placeholder + (required ? '' : ' (opcional)')}
      value={form[field]}
      onChange={e => setForm({ ...form, [field]: e.target.value })}
      required={required}
      className={`input ${span}`}
    />
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">👥 Clientes</h2>
        <p className="text-gray-500 text-sm mt-1">Gerencie sua base de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-700">{clientes.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total de Clientes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">{clientes.filter(c => c.saldo_fiado > 0).length}</p>
          <p className="text-gray-500 text-xs mt-1">Com Fiado</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-emerald-600">{clientes.filter(c => !c.saldo_fiado || c.saldo_fiado === 0).length}</p>
          <p className="text-gray-500 text-xs mt-1">Em Dia</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">
          {editando ? '✏️ Editando Cliente' : 'Novo Cliente'}
        </h3>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {f('nome', 'Nome completo', true, 'sm:col-span-2')}
          {f('telefone', 'Telefone', true)}
          {f('endereco', 'Rua / Endereço', true, 'sm:col-span-2')}
          {f('numero', 'Número', true)}
          {f('complemento', 'Complemento', false)}
          {f('bairro', 'Bairro', true, 'sm:col-span-2')}
          {f('referencia', 'Ponto de referência', false)}

          <div className="col-span-2 sm:col-span-3 flex justify-center gap-3">
            <button type="submit" disabled={loading}
              className={`${editando ? 'btn-success' : 'btn-primary'} px-10`}>
              {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Adicionar Cliente'}
            </button>
            {editando && (
              <button type="button" onClick={cancelar}
                className="border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-5 rounded-xl transition text-sm font-semibold">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="p-4 text-left">Nome</th>
              <th className="p-4 text-left">Telefone</th>
              <th className="p-4 text-left">Endereço</th>
              <th className="p-4 text-left">Bairro</th>
              <th className="p-4 text-left">Fiado</th>
              <th className="p-4 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} className={`table-row ${editando === c.id ? 'bg-blue-50' : ''}`}>
                <td className="p-4 font-medium">{c.nome}</td>
                <td className="p-4 text-gray-500">{c.telefone || '—'}</td>
                <td className="p-4 text-gray-500">
                  {[c.endereco, c.numero, c.complemento].filter(Boolean).join(', ') || '—'}
                  {c.referencia && <span className="block text-xs text-gray-400">Ref: {c.referencia}</span>}
                </td>
                <td className="p-4 text-gray-500">{c.bairro || '—'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.saldo_fiado > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {c.saldo_fiado > 0 ? `R$ ${c.saldo_fiado.toFixed(2)}` : 'Em dia'}
                  </span>
                </td>
                <td className="p-4 flex gap-3">
                  <button onClick={() => iniciarEdicao(c)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition">✏️ Editar</button>
                  <button onClick={() => excluir(c.id)} className="btn-danger">🗑️ Excluir</button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum cliente cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

