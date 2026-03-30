import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Abastecimento() {
  const [registros, setRegistros] = useState([])
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState({ produto_id: '', quantidade: '', preco_compra: '', preco_venda: '', observacao: '' })
  const [loading, setLoading] = useState(false)

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
    const { error } = await supabase.from('abastecimentos').insert([{
      produto_id: form.produto_id || null,
      quantidade: qtd,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      total_compra: totalCompra,
      total_venda_previsto: totalVenda,
      lucro_previsto: lucro,
      observacao: form.observacao || null,
    }])
    if (error) { alert('Erro: ' + error.message); setLoading(false); return }

    // Atualiza estoque do produto
    if (form.produto_id) {
      await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: -qtd })
    }

    // Lança no fluxo de caixa como saída
    await supabase.from('fluxo_caixa').insert([{
      descricao: `Abastecimento — ${produtos.find(p => p.id === form.produto_id)?.nome || 'Produto'}`,
      tipo: 'saida',
      valor: totalCompra,
    }])

    setForm({ produto_id: '', quantidade: '', preco_compra: '', preco_venda: '', observacao: '' })
    await carregar()
    setLoading(false)
  }

  async function excluir(r) {
    if (!confirm('Excluir este abastecimento?')) return
    await supabase.from('abastecimentos').delete().eq('id', r.id)
    // Reverte estoque
    if (r.produto_id) {
      await supabase.rpc('decrementar_estoque', { p_produto_id: r.produto_id, p_quantidade: r.quantidade })
    }
    await carregar()
  }

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  const totalInvestido = registros.reduce((acc, r) => acc + r.total_compra, 0)
  const totalLucroPrevisto = registros.reduce((acc, r) => acc + r.lucro_previsto, 0)
  const totalVendaPrevista = registros.reduce((acc, r) => acc + r.total_venda_previsto, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">🚚 Abastecimento</h2>
        <p className="text-gray-500 text-sm mt-1">Registre a entrada de mercadorias e acompanhe o lucro previsto</p>
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
          <p className="text-gray-500 text-xs mt-1">📈 Lucro Previsto Total</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">Registrar Abastecimento</h3>
        <form onSubmit={salvar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select required value={form.produto_id} onChange={e => selecionarProduto(e.target.value)} className="input sm:col-span-2">
            <option value="">Selecione o produto</option>
            {aguas.length > 0 && (
              <optgroup label="💧 Água Mineral">
                {aguas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''}</option>)}
              </optgroup>
            )}
            {gases.length > 0 && (
              <optgroup label="🔥 Gás de Cozinha">
                {gases.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </optgroup>
            )}
          </select>

          <input type="number" min="1" required placeholder="Quantidade" value={form.quantidade}
            onChange={e => setForm({ ...form, quantidade: e.target.value })} className="input" />

          <input type="number" step="0.01" required placeholder="Preço de compra (R$)" value={form.preco_compra}
            onChange={e => setForm({ ...form, preco_compra: e.target.value })} className="input" />

          <input type="number" step="0.01" required placeholder="Preço de venda (R$)" value={form.preco_venda}
            onChange={e => setForm({ ...form, preco_venda: e.target.value })} className="input" />

          <input placeholder="Observação (opcional)" value={form.observacao}
            onChange={e => setForm({ ...form, observacao: e.target.value })} className="input" />

          {/* Preview */}
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

          <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
            {loading ? 'Salvando...' : '+ Registrar Abastecimento'}
          </button>
        </form>
      </div>

      {/* Tabela */}
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
                    <span className={`font-bold ${r.lucro_previsto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      R$ {r.lucro_previsto.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">({margem}%)</span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => excluir(r)} className="btn-danger">🗑️</button>
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
  )
}
