import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { exportarCSV } from '../lib/exportCsv'
import TelefoneInput from '../components/TelefoneInput'

const formVazio = { nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', referencia: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState(formVazio)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [clienteModal, setClienteModal] = useState(null)
  const { toast, mostrar, fechar } = useToast()

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
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      setEditando(null)
      mostrar('Cliente atualizado!')
    } else {
      const { error } = await supabase.from('clientes').insert([form])
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      mostrar('Cliente cadastrado!')
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
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={fechar} />}

      {/* Modal via portal — renderiza direto no body */}
      {clienteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setClienteModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-blue-800">{clienteModal.nome}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${clienteModal.saldo_fiado > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                  {clienteModal.saldo_fiado > 0 ? `Fiado: R$ ${clienteModal.saldo_fiado.toFixed(2)}` : '✅ Em dia'}
                </span>
              </div>
              <button onClick={() => setClienteModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-blue-50 rounded-2xl p-4 text-sm">
              <div><p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Telefone</p><p className="font-semibold">{clienteModal.telefone || '—'}</p></div>
              <div><p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Bairro</p><p className="font-semibold">{clienteModal.bairro || '—'}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Endereço</p>
                <p className="font-semibold">{[clienteModal.endereco, clienteModal.numero, clienteModal.complemento].filter(Boolean).join(', ') || '—'}</p>
              </div>
              {clienteModal.referencia && (
                <div className="col-span-2"><p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Referência</p><p className="font-semibold">{clienteModal.referencia}</p></div>
              )}
            </div>
            <div className="flex gap-3">
              {clienteModal.telefone && (
                <button onClick={() => {
                  const tel = clienteModal.telefone.replace(/\D/g, '')
                  const msg = `Olá ${clienteModal.nome}! Tudo bem? 😊\n\nPassando para saber se você precisa de água ou gás!\n\n_Guilherme Água e Gás — (83) 98666-6562_`
                  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
                }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-2xl transition text-sm">
                  📲 WhatsApp
                </button>
              )}
              <button onClick={() => { iniciarEdicao(clienteModal); setClienteModal(null) }}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-2xl transition text-sm">
                ✏️ Editar
              </button>
              <button onClick={() => setClienteModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-2xl transition text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">👥 Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => exportarCSV(clientes.map(c => ({
          Nome: c.nome, Telefone: c.telefone || '', Endereço: c.endereco || '',
          Número: c.numero || '', Bairro: c.bairro || '', Complemento: c.complemento || '',
          Referência: c.referencia || '', Fiado: c.saldo_fiado || 0
        })), 'clientes')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          ⬇️ Exportar CSV
        </button>
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
          <TelefoneInput
            value={form.telefone}
            onChange={v => setForm({ ...form, telefone: v })}
            className="input"
            placeholder="Telefone *"
          />
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
                <td className="p-4 font-medium">
                  <button onClick={() => setClienteModal(c)} className="text-blue-700 hover:underline font-semibold text-left">
                    {c.nome}
                  </button>
                </td>
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


