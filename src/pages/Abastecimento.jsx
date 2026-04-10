import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportarCSV } from '../lib/exportCsv'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

export default function Abastecimento() {
  const [registros, setRegistros] = useState([])
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState({ produto_id: '', quantidade: '', preco_compra: '', preco_venda: '', observacao: '' })
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('novo')
  const [filtroData, setFiltroData] = useState({ de: '', ate: '' })
  const [filtroProduto, setFiltroProduto] = useState('')
  const { toast, mostrar, fechar } = useToast()

  async function carregar() {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('abastecimentos').select('*, produtos(nome, categoria)').order('created_at', { ascending: false }),
      supabase.from('produtos').select('*').eq('ativo', true).order('categoria').order('nome'),
    ])
    setRegistros(r || [])
    setProdutos(p || [])
  }

  useEffect(() => { carregar() }, [])

  function selecionarProduto(produto_id) {
    const prod = produtos.find(p => p.id === produto_id)
    setForm(f => ({ ...f, produto_id, preco_venda: prod ? prod.preco.toString() : '' }))
  }

  const qtd = parseInt(form.quantidade || 0)
  const precoCompra = parseFloat(form.preco_compra || 0)
  const precoVenda = parseFloat(form.preco_venda || 0)
  const totalCompra = qtd * precoCompra
  const totalVenda = qtd * precoVenda
  const lucro = totalVenda - totalCompra
  const margemLucro = totalCompra > 0 ? ((lucro / totalCompra) * 100).toFixed(1) : 0

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    if (editando) {
      if (editando.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: editando.produto_id, p_quantidade: editando.quantidade })
      const { error } = await supabase.from('abastecimentos').update({
        produto_id: form.produto_id || null, quantidade: qtd, preco_compra: precoCompra,
        preco_venda: precoVenda, total_compra: totalCompra, total_venda_previsto: totalVenda,
        lucro_previsto: lucro, observacao: form.observacao || null,
      }).eq('id', editando.id)
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      if (form.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: -qtd })
      setEditando(null)
      mostrar('Abastecimento atualizado!')
    } else {
      const { error } = await supabase.from('abastecimentos').insert([{
        produto_id: form.produto_id || null, quantidade: qtd, preco_compra: precoCompra,
        preco_venda: precoVenda, total_compra: totalCompra, total_venda_previsto: totalVenda,
        lucro_previsto: lucro, observacao: form.observacao || null,
      }])
      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }
      if (form.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: -qtd })
      await supabase.from('fluxo_caixa').insert([{
        descricao: `Abastecimento — ${produtos.find(p => p.id === form.produto_id)?.nome || 'Produto'}`,
        tipo: 'saida', valor: totalCompra,
      }])
      mostrar('Abastecimento registrado!')
    }
    setForm({ produto_id: '', quantidade: '', preco_compra: '', preco_venda: '', observacao: '' })
    await carregar()
    setLoading(false)
  }

  function iniciarEdicao(r) {
    setEditando(r)
    setForm({ produto_id: r.produto_id || '', quantidade: r.quantidade.toString(),
      preco_compra: r.preco_compra.toString(), preco_venda: r.preco_venda.toString(), observacao: r.observacao || '' })
    setAba('novo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditando(null)
    setForm({ produto_id: '', quantidade: '', preco_compra: '', preco_venda: '', observacao: '' })
  }

  async function excluir(r) {
    if (!confirm('Excluir este abastecimento?')) return
    await supabase.from('abastecimentos').delete().eq('id', r.id)
    if (r.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: r.produto_id, p_quantidade: r.quantidade })
    await carregar()
    mostrar('Abastecimento excluído!', 'info')
  }

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  const registrosFiltrados = registros.filter(r => {
    const data = new Date(r.created_at)
    if (filtroData.de && data < new Date(filtroData.de)) return false
    if (filtroData.ate && data > new Date(filtroData.ate + 'T23:59:59')) return false
    if (filtroProduto && r.produto_id !== filtroProduto) return false
    return true
  })

  const totalInvestido = registrosFiltrados.reduce((acc, r) => acc + r.total_compra, 0)
  const totalLucroPrevisto = registrosFiltrados.reduce((acc, r) => acc + r.lucro_previsto, 0)
  const totalVendaPrevista = registrosFiltrados.reduce((acc, r) => acc + r.total_venda_previsto, 0)

  return (
    <div className="space-y-6">
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={fechar} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">🚚 Abastecimento</h2>
          <p className="text-gray-500 text-sm mt-1">Registre a entrada de mercadorias e acompanhe o lucro previsto</p>
        </div>
        <button onClick={() => exportarCSV(registrosFiltrados.map(r => ({
          Data: new Date(r.created_at).toLocaleDateString('pt-BR'),
          Produto: r.produtos?.nome || '', Quantidade: r.quantidade,
          'Preço Compra': r.preco_compra, 'Preço Venda': r.preco_venda,
          'Custo Total': r.total_compra, 'Receita Prevista': r.total_venda_previsto,
          'Lucro Previsto': r.lucro_previsto, Observação: r.observacao || '',
        })), 'abastecimentos')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          ⬇️ Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-500">R$ {totalInvestido.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">💸 Total Investido</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-700">R$ {totalVendaPrevista.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">🛒 Receita Prevista</p>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className={`text-2xl font-bold ${totalLucroPrevisto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            R$ {totalLucroPrevisto.toFixed(2)}
          </p>
          <p className="text-gray-500 text-xs mt-1">📈 Lucro Previsto</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        {[{ key: 'novo', label: '+ Novo Abastecimento' }, { key: 'historico', label: '📋 Histórico' }].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${aba === a.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Aba: Novo */}
      {aba === 'novo' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
              {editando ? '✏️ Editando Abastecimento' : 'Registrar Abastecimento'}
            </h3>
            <form onSubmit={salvar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select required value={form.produto_id} onChange={e => selecionarProduto(e.target.value)} className="input sm:col-span-2">
                <option value="">Selecione o produto</option>
                {aguas.length > 0 && <optgroup label="💧 Água Mineral">{aguas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''}</option>)}</optgroup>}
                {gases.length > 0 && <optgroup label="🔥 Gás de Cozinha">{gases.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</optgroup>}
              </select>
              <input type="number" min="1" required placeholder="Quantidade" value={form.quantidade}
                onChange={e => setForm({ ...form, quantidade: e.target.value })} className="input" />
              <input type="number" step="0.01" required placeholder="Preço de compra (R$)" value={form.preco_compra}
                onChange={e => setForm({ ...form, preco_compra: e.target.value })} className="input" />
              <input type="number" step="0.01" required placeholder="Preço de venda (R$)" value={form.preco_venda}
                onChange={e => setForm({ ...form, preco_venda: e.target.value })} className="input" />
              <input placeholder="Observação (opcional)" value={form.observacao}
                onChange={e => setForm({ ...form, observacao: e.target.value })} className="input" />
              {qtd > 0 && precoCompra > 0 && precoVenda > 0 && (
                <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Custo Total</p>
                    <p className="font-bold text-red-500">R$ {totalCompra.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Receita Prevista</p>
                    <p className="font-bold text-blue-700">R$ {totalVenda.toFixed(2)}</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${lucro >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-xs text-gray-500 mb-1">Lucro Previsto</p>
                    <p className={`font-bold ${lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      R$ {lucro.toFixed(2)} <span className="text-xs font-normal">({margemLucro}%)</span>
                    </p>
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading} className={`sm:col-span-2 ${editando ? 'btn-success' : 'btn-primary'}`}>
                {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Registrar Abastecimento'}
              </button>
              {editando && (
                <button type="button" onClick={cancelar}
                  className="sm:col-span-2 border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-5 rounded-xl transition text-sm font-semibold">
                  Cancelar
                </button>
              )}
            </form>
          </div>

          {/* Tabela recentes */}
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Produto</th>
                  <th className="p-4 text-left">Qtd</th>
                  <th className="p-4 text-left">Compra</th>
                  <th className="p-4 text-left">Venda</th>
                  <th className="p-4 text-left">Custo</th>
                  <th className="p-4 text-left">Receita</th>
                  <th className="p-4 text-left">Lucro</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const margem = r.total_compra > 0 ? ((r.lucro_previsto / r.total_compra) * 100).toFixed(1) : 0
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 whitespace-nowrap font-medium">{r.produtos?.nome || '—'}</td>
                      <td className="p-4 text-center font-bold text-blue-700">{r.quantidade}</td>
                      <td className="p-4 whitespace-nowrap text-red-500">R$ {r.preco_compra.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap text-blue-600">R$ {r.preco_venda.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap font-semibold text-red-500">R$ {r.total_compra.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap font-semibold text-blue-700">R$ {r.total_venda_previsto.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`font-bold ${r.lucro_previsto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {r.lucro_previsto.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1">({margem}%)</span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => iniciarEdicao(r)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition">✏️</button>
                          <button onClick={() => excluir(r)} className="btn-danger">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {registros.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">Nenhum abastecimento registrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba: Histórico */}
      {aba === 'historico' && (
        <div className="space-y-4">
          <div className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">De</label>
              <input type="date" value={filtroData.de} onChange={e => setFiltroData(f => ({ ...f, de: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Até</label>
              <input type="date" value={filtroData.ate} onChange={e => setFiltroData(f => ({ ...f, ate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Produto</label>
              <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className="input">
                <option value="">Todos os produtos</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''}</option>)}
              </select>
            </div>
            {(filtroData.de || filtroData.ate || filtroProduto) && (
              <button onClick={() => { setFiltroData({ de: '', ate: '' }); setFiltroProduto('') }}
                className="sm:col-span-3 text-xs text-blue-600 hover:underline text-left">
                ✕ Limpar filtros — {registrosFiltrados.length} resultado(s)
              </button>
            )}
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Produto</th>
                  <th className="p-4 text-left">Qtd</th>
                  <th className="p-4 text-left">Preço Compra</th>
                  <th className="p-4 text-left">Preço Venda</th>
                  <th className="p-4 text-left">Custo Total</th>
                  <th className="p-4 text-left">Receita Prev.</th>
                  <th className="p-4 text-left">Lucro Prev.</th>
                  <th className="p-4 text-left">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map(r => {
                  const margem = r.total_compra > 0 ? ((r.lucro_previsto / r.total_compra) * 100).toFixed(1) : 0
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 whitespace-nowrap font-medium">{r.produtos?.nome || '—'}</td>
                      <td className="p-4 text-center font-bold text-blue-700">{r.quantidade}</td>
                      <td className="p-4 whitespace-nowrap text-red-500">R$ {r.preco_compra.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap text-blue-600">R$ {r.preco_venda.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap font-semibold text-red-500">R$ {r.total_compra.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap font-semibold text-blue-700">R$ {r.total_venda_previsto.toFixed(2)}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`font-bold ${r.lucro_previsto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {r.lucro_previsto.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1">({margem}%)</span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{r.observacao || '—'}</td>
                    </tr>
                  )
                })}
                {registrosFiltrados.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
                )}
                {registrosFiltrados.length > 0 && (
                  <tr className="bg-blue-50 font-bold text-sm">
                    <td colSpan={5} className="p-4 text-right text-blue-700">Totais:</td>
                    <td className="p-4 text-red-500">R$ {totalInvestido.toFixed(2)}</td>
                    <td className="p-4 text-blue-700">R$ {totalVendaPrevista.toFixed(2)}</td>
                    <td className="p-4 text-emerald-600">R$ {totalLucroPrevisto.toFixed(2)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

