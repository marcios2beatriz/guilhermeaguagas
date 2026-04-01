import { useState, useRef, useEffect } from 'react'

export default function ClienteSelect({ clientes, value, onChange, required }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef()
  const inputRef = useRef()

  const selecionado = clientes.find(c => c.id === value)

  useEffect(() => {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

    const filtrados = clientes.filter(c => {
    if (!busca) return true
    const q = busca.toLowerCase().trim()
    const telLimpo = (c.telefone || '').replace(/\D/g, '')
    const buscaLimpa = busca.replace(/\D/g, '')
    // busca por nome
    if (c.nome.toLowerCase().includes(q)) return true
    // busca por telefone — qualquer parte dos dígitos
    if (buscaLimpa.length >= 2 && telLimpo.includes(buscaLimpa)) return true
    return false
  })

  function selecionar(c) {
    onChange(c.id)
    setBusca('')
    setAberto(false)
  }

  function limpar(e) {
    e.stopPropagation()
    onChange('')
    setBusca('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Campo de busca sempre visível */}
      <div className={`flex items-center border-2 rounded-xl bg-white transition ${aberto ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'}`}>
        {selecionado ? (
          // Cliente selecionado — mostra nome e botão limpar
          <div className="flex items-center justify-between w-full px-4 py-2.5">
            <div>
              <span className="font-semibold text-gray-800 text-sm">{selecionado.nome}</span>
              {selecionado.telefone && (
                <span className="text-gray-400 text-xs ml-2">{selecionado.telefone}</span>
              )}
              {selecionado.saldo_fiado > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                  Fiado R$ {selecionado.saldo_fiado.toFixed(2)}
                </span>
              )}
            </div>
            <button type="button" onClick={limpar}
              className="text-gray-300 hover:text-red-400 transition text-lg leading-none ml-2">✕</button>
          </div>
        ) : (
          // Campo de digitação
          <input
            ref={inputRef}
            type="text"
            placeholder="🔍 Digite o nome ou telefone do cliente..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setAberto(true) }}
            onFocus={() => setAberto(true)}
            className="w-full px-4 py-2.5 text-sm bg-transparent outline-none rounded-xl placeholder-gray-400"
          />
        )}
      </div>

      {/* Dropdown */}
      {aberto && !selecionado && (
        <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-2xl shadow-2xl mt-1 overflow-hidden">
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-gray-500">
              {busca
                ? `${filtrados.length} resultado(s) para "${busca}"`
                : `${clientes.length} clientes cadastrados`}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="p-4 text-center text-gray-400 text-sm">Nenhum cliente encontrado</p>
            ) : (
              filtrados.map(c => (
                <button key={c.id} type="button" onClick={() => selecionar(c)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.telefone || 'Sem telefone'}
                      {c.bairro ? ` • ${c.bairro}` : ''}
                    </p>
                  </div>
                  {c.saldo_fiado > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                      Fiado R$ {c.saldo_fiado.toFixed(2)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {required && <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} />}
    </div>
  )
}
