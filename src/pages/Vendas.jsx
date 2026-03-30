import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FORM_VAZIO = {
  cliente_id: '', produto_id: '', quantidade: 1, valor_unit: '',
  fiado: false, tem_desconto: false, desconto_tipo: 'percentual', desconto_valor: '',
  forma_pagamento: 'dinheiro', pago_na_entrega: false, troco_para: '',
}

function calcularTotal(form) {
  const subtotal = parseFloat(form.valor_unit || 0) * parseInt(form.quantidade || 1)
  if (!form.tem_desconto || !form.desconto_valor) return subtotal
  if (form.desconto_tipo === 'percentual') {
    return subtotal - (subtotal * parseFloat(form.desconto_valor) / 100)
  }
  return Math.max(0, subtotal - parseFloat(form.desconto_valor))
}

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [editando, setEditando] = useState(null) // venda original antes da edição
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const [{ data: v }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome, telefone, endereco, numero, bairro, complemento), produtos(nome, categoria)').order('created_at', { ascending: false }).limit(100),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('produtos').select('*').eq('ativo', true).order('categoria').order('nome'),
    ])
    setVendas(v || [])
    setClientes(c || [])
    setProdutos(p || [])
  }

  useEffect(() => { carregar() }, [])

  function selecionarProduto(produto_id) {
    const prod = produtos.find(p => p.id === produto_id)
    setForm(f => ({ ...f, produto_id, valor_unit: prod ? prod.preco.toString() : '' }))
  }

  function iniciarEdicao(v) {
    setEditando(v)
    setForm({
      cliente_id: v.cliente_id || '',
      produto_id: v.produto_id || '',
      quantidade: v.quantidade,
      valor_unit: v.valor_unit.toString(),
      fiado: v.fiado,
      tem_desconto: !!v.desconto_valor,
      desconto_tipo: v.desconto_tipo || 'percentual',
      desconto_valor: v.desconto_valor ? v.desconto_valor.toString() : '',
      forma_pagamento: v.forma_pagamento || 'dinheiro',
      pago_na_entrega: v.pago_na_entrega || false,
      troco_para: v.troco_para ? v.troco_para.toString() : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditando(null)
    setForm(FORM_VAZIO)
  }

  async function salvar(e) {
    e.preventDefault()
    setLoading(true)
    const total = calcularTotal(form)
    const desconto_valor = form.tem_desconto && form.desconto_valor ? parseFloat(form.desconto_valor) : 0
    const desconto_tipo = form.tem_desconto ? form.desconto_tipo : null

    if (editando) {
      const totalAntigo = editando.total
      const qtdAntiga = editando.quantidade

      const { error } = await supabase.from('vendas').update({
        cliente_id: form.cliente_id || null,
        produto_id: form.produto_id || null,
        quantidade: parseInt(form.quantidade),
        valor_unit: parseFloat(form.valor_unit),
        total,
        fiado: form.fiado,
        desconto_tipo,
        desconto_valor,
        forma_pagamento: form.forma_pagamento,
        pago_na_entrega: form.pago_na_entrega,
        troco_para: form.troco_para ? parseFloat(form.troco_para) : null,
      }).eq('id', editando.id)

      if (error) { alert('Erro: ' + error.message); setLoading(false); return }

      // Reverte estoque antigo e aplica novo
      if (editando.produto_id) {
        await supabase.rpc('decrementar_estoque', { p_produto_id: editando.produto_id, p_quantidade: -qtdAntiga })
      }
      if (form.produto_id) {
        await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: parseInt(form.quantidade) })
      }

      // Ajusta fiado: reverte o antigo e aplica o novo
      if (editando.fiado && editando.cliente_id) {
        await supabase.rpc('abater_fiado', { p_cliente_id: editando.cliente_id, p_valor: totalAntigo })
      }
      if (form.fiado && form.cliente_id) {
        await supabase.rpc('incrementar_fiado', { p_cliente_id: form.cliente_id, p_valor: total })
      }

      setEditando(null)
    } else {
      const { error } = await supabase.from('vendas').insert([{
        cliente_id: form.cliente_id || null,
        produto_id: form.produto_id || null,
        quantidade: parseInt(form.quantidade),
        valor_unit: parseFloat(form.valor_unit),
        total,
        fiado: form.fiado,
        desconto_tipo,
        desconto_valor,
        forma_pagamento: form.forma_pagamento,
        pago_na_entrega: form.pago_na_entrega,
        troco_para: form.troco_para ? parseFloat(form.troco_para) : null,
      }])
      if (error) { alert('Erro: ' + error.message); setLoading(false); return }

      // Diminui estoque
      if (form.produto_id) {
        await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: parseInt(form.quantidade) })
      }

      if (form.fiado && form.cliente_id) {
        await supabase.rpc('incrementar_fiado', { p_cliente_id: form.cliente_id, p_valor: total })
      }
    }

    setForm(FORM_VAZIO)
    await carregar()
    setLoading(false)
  }

  function enviarWhatsApp(v) {
    const cliente = v.clientes?.nome || 'Cliente'
    const produto = v.produtos?.nome || v.produto || 'Produto'
    const data = new Date(v.created_at).toLocaleDateString('pt-BR')
    const pgto = v.fiado ? 'Fiado' : v.forma_pagamento === 'pix' ? 'Pix' : v.forma_pagamento === 'cartao' ? 'Cartão' : 'Dinheiro'
    const entrega = v.pago_na_entrega ? '\n💳 Pagamento na entrega' : ''
    const troco = v.troco_para > 0 ? `\n💵 Troco para: R$ ${v.troco_para.toFixed(2)}` : ''
    const desconto = v.desconto_valor > 0
      ? `\n🏷️ Desconto: ${v.desconto_tipo === 'percentual' ? v.desconto_valor + '%' : 'R$ ' + v.desconto_valor.toFixed(2)}`
      : ''

    const endParts = [v.clientes?.endereco, v.clientes?.numero, v.clientes?.complemento, v.clientes?.bairro].filter(Boolean)
    const endereco = endParts.length > 0 ? endParts.join(', ') : null
    const telefone = v.clientes?.telefone || null

    const msg = `🛒 *Pedido — Guilherme Água e Gás*\n\n` +
      `👤 Cliente: ${cliente}\n` +
      (telefone ? `📞 Telefone: ${telefone}\n` : '') +
      (endereco ? `📍 Endereço: ${endereco}\n` : '') +
      `\n📦 Produto: ${produto}\n` +
      `🔢 Quantidade: ${v.quantidade}\n` +
      `💰 Valor unit.: R$ ${v.valor_unit?.toFixed(2)}${desconto}\n` +
      `✅ *Total: R$ ${v.total?.toFixed(2)}*\n` +
      `\n💳 Pagamento: ${pgto}${entrega}${troco}\n` +
      `📅 Data: ${data}\n\n` +
      `_Guilherme Água e Gás — (83) 9 8862-3431_`

    const tel = v.clientes?.telefone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  async function excluir(v) {
    if (!confirm(`Excluir venda de R$ ${v.total.toFixed(2)}?`)) return

    const { error } = await supabase.from('vendas').delete().eq('id', v.id)
    if (error) { alert('Erro: ' + error.message); return }

    // Devolve estoque
    if (v.produto_id) {
      await supabase.rpc('decrementar_estoque', { p_produto_id: v.produto_id, p_quantidade: -v.quantidade })
    }

    // Se era fiado, reverte o saldo
    if (v.fiado && v.cliente_id) {
      await supabase.rpc('abater_fiado', { p_cliente_id: v.cliente_id, p_valor: v.total })
    }

    await carregar()
  }

  const totalDia = vendas
    .filter(v => new Date(v.created_at).toDateString() === new Date().toDateString())
    .reduce((acc, v) => acc + v.total, 0)

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-800">🛒 Vendas</h2>
        <p className="text-gray-500 text-sm mt-1">Registre as vendas do dia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-700">{vendas.length}</p>
          <p className="text-gray-500 text-xs mt-1">Total de Vendas</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-emerald-600">R$ {totalDia.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">Vendas Hoje</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">
          {editando ? '✏️ Editando Venda' : 'Nova Venda'}
        </h3>
        <form onSubmit={salvar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} className="input">
            <option value="">Cliente (opcional)</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <select required value={form.produto_id} onChange={e => selecionarProduto(e.target.value)} className="input">
            <option value="">Selecione o produto</option>
            {aguas.length > 0 && (
              <optgroup label="💧 Água Mineral">
                {aguas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''} (R$ {p.preco.toFixed(2)})</option>)}
              </optgroup>
            )}
            {gases.length > 0 && (
              <optgroup label="🔥 Gás de Cozinha">
                {gases.map(p => <option key={p.id} value={p.id}>{p.nome} (R$ {p.preco.toFixed(2)})</option>)}
              </optgroup>
            )}
          </select>

          <input type="number" min="1" placeholder="Quantidade" value={form.quantidade}
            onChange={e => setForm({ ...form, quantidade: e.target.value })} className="input" />

          <input type="number" step="0.01" required placeholder="Valor unitário (R$)" value={form.valor_unit}
            onChange={e => setForm({ ...form, valor_unit: e.target.value })} className="input" />

          {form.valor_unit && form.quantidade && (
            <div className="sm:col-span-2 space-y-2">
              {/* Toggle desconto */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tem_desconto}
                  onChange={e => setForm({ ...form, tem_desconto: e.target.checked, desconto_valor: '' })}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-600">Aplicar desconto</span>
              </label>

              {/* Campos de desconto */}
              {form.tem_desconto && (
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button type="button" onClick={() => setForm({ ...form, desconto_tipo: 'percentual' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${form.desconto_tipo === 'percentual' ? 'bg-white text-blue-700 shadow' : 'text-gray-400'}`}>
                      %
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, desconto_tipo: 'nominal' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${form.desconto_tipo === 'nominal' ? 'bg-white text-blue-700 shadow' : 'text-gray-400'}`}>
                      R$
                    </button>
                  </div>
                  <input type="number" step="0.01" min="0" placeholder={form.desconto_tipo === 'percentual' ? 'Ex: 10 (%)' : 'Ex: 5,00 (R$)'}
                    value={form.desconto_valor}
                    onChange={e => setForm({ ...form, desconto_valor: e.target.value })}
                    className="input flex-1" />
                </div>
              )}

              {/* Preview do total */}
              <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${form.tem_desconto && form.desconto_valor ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                {form.tem_desconto && form.desconto_valor ? (
                  <span>
                    Subtotal: R$ {(parseFloat(form.valor_unit) * parseInt(form.quantidade || 1)).toFixed(2)}
                    {' → '}Total com desconto: <strong>R$ {calcularTotal(form).toFixed(2)}</strong>
                  </span>
                ) : (
                  <span>Total: R$ {calcularTotal(form).toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
            <input type="checkbox" checked={form.fiado} onChange={e => setForm({ ...form, fiado: e.target.checked })}
              className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-600">Lançar no fiado</span>
          </label>

          {/* Forma de pagamento */}
          <div className="sm:col-span-2 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Forma de Pagamento</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { val: 'dinheiro', label: '💵 Dinheiro' },
                { val: 'pix', label: '📱 Pix' },
                { val: 'cartao', label: '💳 Cartão' },
              ].map(op => (
                <button key={op.val} type="button"
                  onClick={() => setForm({ ...form, forma_pagamento: op.val, fiado: false })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.forma_pagamento === op.val && !form.fiado ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {op.label}
                </button>
              ))}
              <button type="button"
                onClick={() => setForm({ ...form, fiado: true, forma_pagamento: 'fiado' })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.fiado ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}>
                📋 Fiado
              </button>
            </div>

            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pago_na_entrega}
                  onChange={e => setForm({ ...form, pago_na_entrega: e.target.checked })}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-600">Pagar na entrega</span>
              </label>
            </div>

            {form.forma_pagamento === 'dinheiro' && !form.fiado && (
              <input type="number" step="0.01" placeholder="Troco para (R$) — opcional"
                value={form.troco_para}
                onChange={e => setForm({ ...form, troco_para: e.target.value })}
                className="input" />
            )}
          </div>

          <button type="submit" disabled={loading}
            className={`sm:col-span-2 ${editando ? 'btn-success' : 'btn-primary'}`}>
            {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Registrar Venda'}
          </button>
          {editando && (
            <button type="button" onClick={cancelar}
              className="sm:col-span-2 border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-5 rounded-xl transition text-sm font-semibold">
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
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-left">Produto</th>
              <th className="p-4 text-left">Qtd</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Desconto</th>
              <th className="p-4 text-left">Pgto</th>
              <th className="p-4 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map(v => (
              <tr key={v.id} className={`table-row ${editando?.id === v.id ? 'bg-blue-50' : ''}`}>
                <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-4 whitespace-nowrap">{v.clientes?.nome || '—'}</td>
                <td className="p-4 whitespace-nowrap">{v.produtos?.nome || '—'}</td>
                <td className="p-4 text-gray-500">{v.quantidade}</td>
                <td className="p-4 font-semibold text-emerald-600 whitespace-nowrap">R$ {v.total?.toFixed(2)}</td>
                <td className="p-4 whitespace-nowrap">
                  {v.desconto_valor > 0
                    ? <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold">
                        {v.desconto_tipo === 'percentual' ? `${v.desconto_valor}%` : `R$ ${v.desconto_valor.toFixed(2)}`}
                      </span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="p-4">
                  {v.fiado
                    ? <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600 font-semibold whitespace-nowrap">📋 Fiado</span>
                    : v.forma_pagamento === 'pix'
                    ? <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 font-semibold whitespace-nowrap">📱 Pix</span>
                    : v.forma_pagamento === 'cartao'
                    ? <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-semibold whitespace-nowrap">💳 Cartão</span>
                    : <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 font-semibold whitespace-nowrap">💵 Dinheiro</span>}
                  {v.pago_na_entrega && <span className="ml-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold whitespace-nowrap">Na entrega</span>}
                  {v.troco_para > 0 && <span className="block text-xs text-gray-400 mt-0.5">Troco p/ R$ {v.troco_para.toFixed(2)}</span>}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => enviarWhatsApp(v)}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-lg transition whitespace-nowrap">
                      📲 WhatsApp
                    </button>
                    <button onClick={() => iniciarEdicao(v)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition whitespace-nowrap">✏️</button>
                    <button onClick={() => excluir(v)} className="btn-danger whitespace-nowrap">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma venda registrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
