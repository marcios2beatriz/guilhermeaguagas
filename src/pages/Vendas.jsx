import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ClienteSelect from '../components/ClienteSelect'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { exportarCSV } from '../lib/exportCsv'

const ITEM_VAZIO = { produto_id: '', quantidade: 1, valor_unit: '', tem_desconto: false, desconto_tipo: 'percentual', desconto_valor: '' }

const FORM_VAZIO = {
  cliente_id: '',
  forma_pagamento: 'dinheiro', pago_na_entrega: false, troco_para: '',
  fiado: false,
}

function calcularTotalItem(item) {
  const subtotal = parseFloat(item.valor_unit || 0) * parseInt(item.quantidade || 1)
  if (!item.tem_desconto || !item.desconto_valor) return subtotal
  if (item.desconto_tipo === 'percentual') return subtotal - (subtotal * parseFloat(item.desconto_valor) / 100)
  return Math.max(0, subtotal - parseFloat(item.desconto_valor))
}

// mantém compatibilidade com venda única (edição)
function calcularTotal(form) {
  const subtotal = parseFloat(form.valor_unit || 0) * parseInt(form.quantidade || 1)
  if (!form.tem_desconto || !form.desconto_valor) return subtotal
  if (form.desconto_tipo === 'percentual') return subtotal - (subtotal * parseFloat(form.desconto_valor) / 100)
  return Math.max(0, subtotal - parseFloat(form.desconto_valor))
}

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const hoje = new Date().toISOString().split('T')[0]
  const [aba, setAba] = useState('nova')
  const [filtro, setFiltro] = useState({ de: hoje, ate: hoje, cliente_id: '', forma_pagamento: '' })
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]) // carrinho de itens
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  const { toast, mostrar, fechar } = useToast()

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

  function selecionarProdutoItem(idx, produto_id) {
    const prod = produtos.find(p => p.id === produto_id)
    setItens(prev => prev.map((it, i) => i === idx
      ? { ...it, produto_id, valor_unit: prod ? prod.preco.toString() : '' }
      : it
    ))
  }

  function atualizarItem(idx, campo, valor) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  function adicionarItem() {
    setItens(prev => [...prev, { ...ITEM_VAZIO }])
  }

  function removerItem(idx) {
    setItens(prev => prev.filter((_, i) => i !== idx))
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

    if (editando) {
      // Edição mantém lógica de item único
      const total = calcularTotal(form)
      const desconto_valor = form.tem_desconto && form.desconto_valor ? parseFloat(form.desconto_valor) : 0
      const desconto_tipo = form.tem_desconto ? form.desconto_tipo : null
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

      if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }

      if (editando.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: editando.produto_id, p_quantidade: -qtdAntiga })
      if (form.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: form.produto_id, p_quantidade: parseInt(form.quantidade) })
      if (editando.fiado && editando.cliente_id) await supabase.rpc('abater_fiado', { p_cliente_id: editando.cliente_id, p_valor: totalAntigo })
      if (form.fiado && form.cliente_id) await supabase.rpc('incrementar_fiado', { p_cliente_id: form.cliente_id, p_valor: total })

      setEditando(null)
    } else {
      // Nova venda — múltiplos itens
      const itensValidos = itens.filter(it => it.produto_id && it.valor_unit && it.quantidade)
      if (!itensValidos.length) { mostrar('Adicione pelo menos um produto', 'erro'); setLoading(false); return }

      for (const item of itensValidos) {
        const total = calcularTotalItem(item)
        const desconto_valor = item.tem_desconto && item.desconto_valor ? parseFloat(item.desconto_valor) : 0
        const desconto_tipo = item.tem_desconto ? item.desconto_tipo : null

        const { error } = await supabase.from('vendas').insert([{
          cliente_id: form.cliente_id || null,
          produto_id: item.produto_id,
          quantidade: parseInt(item.quantidade),
          valor_unit: parseFloat(item.valor_unit),
          total,
          fiado: form.fiado,
          desconto_tipo,
          desconto_valor,
          forma_pagamento: form.forma_pagamento,
          pago_na_entrega: form.pago_na_entrega,
          troco_para: form.troco_para ? parseFloat(form.troco_para) : null,
        }])
        if (error) { mostrar('Erro: ' + error.message, 'erro'); setLoading(false); return }

        if (item.produto_id) await supabase.rpc('decrementar_estoque', { p_produto_id: item.produto_id, p_quantidade: parseInt(item.quantidade) })
        if (form.fiado && form.cliente_id) await supabase.rpc('incrementar_fiado', { p_cliente_id: form.cliente_id, p_valor: total })
      }
    }

    setForm(FORM_VAZIO)
    setItens([{ ...ITEM_VAZIO }])
    await carregar()
    setLoading(false)
    mostrar(editando ? 'Venda atualizada!' : `${itens.filter(i => i.produto_id).length} item(s) registrado(s)!`)
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
      `_Guilherme Água e Gás — (83) 98666-6562_`

    const tel = v.clientes?.telefone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  async function excluir(v) {
    if (!confirm(`Excluir venda de R$ ${v.total.toFixed(2)}?`)) return

    const { error } = await supabase.from('vendas').delete().eq('id', v.id)
    if (error) { mostrar('Erro: ' + error.message, 'erro'); return }

    // Devolve estoque
    if (v.produto_id) {
      await supabase.rpc('decrementar_estoque', { p_produto_id: v.produto_id, p_quantidade: -v.quantidade })
    }

    // Se era fiado, reverte o saldo
    if (v.fiado && v.cliente_id) {
      await supabase.rpc('abater_fiado', { p_cliente_id: v.cliente_id, p_valor: v.total })
    }

    await carregar()
    mostrar('Venda excluída!', 'info')
  }

  const totalDia = vendas
    .filter(v => new Date(v.created_at).toDateString() === new Date().toDateString())
    .reduce((acc, v) => acc + v.total, 0)

  const aguas = produtos.filter(p => p.categoria === 'agua')
  const gases = produtos.filter(p => p.categoria === 'gas')

  // Filtro do histórico
  const vendasFiltradas = vendas.filter(v => {
    const data = new Date(v.created_at)
    if (filtro.de && data < new Date(filtro.de)) return false
    if (filtro.ate && data > new Date(filtro.ate + 'T23:59:59')) return false
    if (filtro.cliente_id && v.cliente_id !== filtro.cliente_id) return false
    if (filtro.forma_pagamento === 'fiado' && !v.fiado) return false
    if (filtro.forma_pagamento && filtro.forma_pagamento !== 'fiado' && v.forma_pagamento !== filtro.forma_pagamento) return false
    return true
  })

  const totalFiltrado = vendasFiltradas.reduce((acc, v) => acc + v.total, 0)

  return (
    <div className="space-y-6">
      {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={fechar} />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">🛒 Vendas</h2>
          <p className="text-gray-500 text-sm mt-1">Registre as vendas do dia</p>
        </div>
        <button onClick={() => exportarCSV(vendasFiltradas.map(v => ({
          Data: new Date(v.created_at).toLocaleDateString('pt-BR'),
          Cliente: v.clientes?.nome || '',
          Produto: v.produtos?.nome || '',
          Quantidade: v.quantidade,
          'Valor Unit.': v.valor_unit,
          Total: v.total,
          Pagamento: v.fiado ? 'Fiado' : v.forma_pagamento || '',
        })), 'vendas')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          ⬇️ Exportar CSV
        </button>
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

      {/* Abas */}
      <div className="flex gap-2">
        {[{ key: 'nova', label: '+ Nova Venda' }, { key: 'historico', label: '📋 Histórico' }].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${aba === a.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Aba: Nova Venda */}
      {aba === 'nova' && (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">
          {editando ? '✏️ Editando Venda' : 'Nova Venda'}
        </h3>
        <form onSubmit={salvar} className="space-y-4">
          {/* Cliente */}
          <ClienteSelect clientes={clientes} value={form.cliente_id}
            onChange={id => setForm({ ...form, cliente_id: id })} required />

          {/* Itens — só na nova venda */}
          {!editando && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produtos</p>
                <button type="button" onClick={adicionarItem}
                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-xl transition">
                  + Adicionar produto
                </button>
              </div>
              {itens.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-3 space-y-2 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Item {idx + 1}</span>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removerItem(idx)} className="text-red-400 hover:text-red-600 text-xs">✕ Remover</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select value={item.produto_id} onChange={e => selecionarProdutoItem(idx, e.target.value)} className="input sm:col-span-2">
                      <option value="">Selecione o produto</option>
                      {aguas.length > 0 && <optgroup label="💧 Água Mineral">{aguas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''} (R$ {p.preco.toFixed(2)})</option>)}</optgroup>}
                      {gases.length > 0 && <optgroup label="🔥 Gás de Cozinha">{gases.map(p => <option key={p.id} value={p.id}>{p.nome} (R$ {p.preco.toFixed(2)})</option>)}</optgroup>}
                    </select>
                    <input type="number" min="1" placeholder="Qtd" value={item.quantidade}
                      onChange={e => atualizarItem(idx, 'quantidade', e.target.value)} className="input" />
                    <input type="number" step="0.01" placeholder="Valor unit. (R$)" value={item.valor_unit}
                      onChange={e => atualizarItem(idx, 'valor_unit', e.target.value)} className="input" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={item.tem_desconto}
                        onChange={e => atualizarItem(idx, 'tem_desconto', e.target.checked)}
                        className="w-4 h-4 accent-blue-600" />
                      <span className="text-xs text-gray-600">Desconto</span>
                    </label>
                    {item.tem_desconto && (
                      <div className="flex gap-2 sm:col-span-2">
                        <div className="flex bg-white rounded-xl border border-gray-200 p-0.5">
                          <button type="button" onClick={() => atualizarItem(idx, 'desconto_tipo', 'percentual')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${item.desconto_tipo === 'percentual' ? 'bg-blue-700 text-white' : 'text-gray-400'}`}>%</button>
                          <button type="button" onClick={() => atualizarItem(idx, 'desconto_tipo', 'nominal')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${item.desconto_tipo === 'nominal' ? 'bg-blue-700 text-white' : 'text-gray-400'}`}>R$</button>
                        </div>
                        <input type="number" step="0.01" min="0" placeholder="Valor desconto" value={item.desconto_valor}
                          onChange={e => atualizarItem(idx, 'desconto_valor', e.target.value)} className="input flex-1" />
                      </div>
                    )}
                  </div>
                  {item.valor_unit && item.quantidade && (
                    <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-1.5">
                      Total: R$ {calcularTotalItem(item).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              {/* Total geral do pedido */}
              {itens.some(i => i.valor_unit && i.quantidade) && (
                <div className="bg-blue-700 text-white rounded-2xl px-4 py-3 text-sm font-bold flex justify-between">
                  <span>Total do Pedido</span>
                  <span>R$ {itens.reduce((acc, i) => acc + calcularTotalItem(i), 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Edição — campos simples */}
          {editando && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select value={form.produto_id} onChange={e => selecionarProduto(e.target.value)} className="input">
                <option value="">Selecione o produto</option>
                {aguas.length > 0 && <optgroup label="💧 Água Mineral">{aguas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.marca ? ` — ${p.marca}` : ''}</option>)}</optgroup>}
                {gases.length > 0 && <optgroup label="🔥 Gás de Cozinha">{gases.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</optgroup>}
              </select>
              <input type="number" min="1" placeholder="Quantidade" value={form.quantidade}
                onChange={e => setForm({ ...form, quantidade: e.target.value })} className="input" />
              <input type="number" step="0.01" placeholder="Valor unitário (R$)" value={form.valor_unit}
                onChange={e => setForm({ ...form, valor_unit: e.target.value })} className="input sm:col-span-2" />
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Forma de Pagamento</p>
            <div className="flex gap-2 flex-wrap">
              {[{ val: 'dinheiro', label: '💵 Dinheiro' }, { val: 'pix', label: '📱 Pix' }, { val: 'cartao', label: '💳 Cartão' }].map(op => (
                <button key={op.val} type="button"
                  onClick={() => setForm({ ...form, forma_pagamento: op.val, fiado: false })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.forma_pagamento === op.val && !form.fiado ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {op.label}
                </button>
              ))}
              <button type="button" onClick={() => setForm({ ...form, fiado: true, forma_pagamento: 'fiado' })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.fiado ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}>
                📋 Fiado
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pago_na_entrega}
                onChange={e => setForm({ ...form, pago_na_entrega: e.target.checked })} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-600">Pagar na entrega</span>
            </label>
            {form.forma_pagamento === 'dinheiro' && !form.fiado && (
              <input type="number" step="0.01" placeholder="Troco para (R$) — opcional"
                value={form.troco_para} onChange={e => setForm({ ...form, troco_para: e.target.value })} className="input" />
            )}
          </div>

          <button type="submit" disabled={loading} className={editando ? 'btn-success' : 'btn-primary'}>
            {loading ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '+ Registrar Venda'}
          </button>
          {editando && (
            <button type="button" onClick={cancelar}
              className="w-full border border-gray-300 text-gray-600 hover:bg-gray-100 py-2.5 px-5 rounded-xl transition text-sm font-semibold mt-2">
              Cancelar
            </button>
          )}
        </form>
      </div>
      )} {/* fim aba nova */}

      {/* Aba: Histórico */}
      {aba === 'historico' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">De</label>
              <input type="date" value={filtro.de} onChange={e => setFiltro(f => ({ ...f, de: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Até</label>
              <input type="date" value={filtro.ate} onChange={e => setFiltro(f => ({ ...f, ate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cliente</label>
              <select value={filtro.cliente_id} onChange={e => setFiltro(f => ({ ...f, cliente_id: e.target.value }))} className="input">
                <option value="">Todos</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pagamento</label>
              <select value={filtro.forma_pagamento} onChange={e => setFiltro(f => ({ ...f, forma_pagamento: e.target.value }))} className="input">
                <option value="">Todos</option>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">📱 Pix</option>
                <option value="cartao">💳 Cartão</option>
                <option value="fiado">📋 Fiado</option>
              </select>
            </div>
            {(filtro.de || filtro.ate || filtro.cliente_id || filtro.forma_pagamento) && (
              <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
                <button onClick={() => setFiltro({ de: '', ate: '', cliente_id: '', forma_pagamento: '' })}
                  className="text-xs text-blue-600 hover:underline">
                  ✕ Limpar filtros — {vendasFiltradas.length} resultado(s)
                </button>
                <span className="text-sm font-bold text-emerald-600">Total: R$ {totalFiltrado.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Tabela */}
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
                {vendasFiltradas.map(v => (
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
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => enviarWhatsApp(v)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-lg transition whitespace-nowrap">
                          📲
                        </button>
                        <button onClick={() => { iniciarEdicao(v); setAba('nova') }} className="text-blue-500 hover:text-blue-700 text-xs font-semibold transition whitespace-nowrap">✏️</button>
                        <button onClick={() => excluir(v)} className="btn-danger whitespace-nowrap">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendasFiltradas.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">Nenhuma venda encontrada</td></tr>
                )}
                {vendasFiltradas.length > 0 && (
                  <tr className="bg-blue-50 font-bold text-sm">
                    <td colSpan={4} className="p-4 text-right text-blue-700">Total:</td>
                    <td className="p-4 text-emerald-600">R$ {totalFiltrado.toFixed(2)}</td>
                    <td colSpan={3}></td>
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
