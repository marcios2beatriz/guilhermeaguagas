import { useState, useRef, useEffect } from 'react'

export default function ClienteSelect({ clientes, value, onChange, required }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const inputRef = useRef()
  const ref = useRef()

  const selecionado = clientes.find(c => c.id === value)

  useEffect(() => {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const filtrados = clientes.filter(c => {
    if (!busca) return true
    const q = busca.toLowerCase()
    const telLimpo = (c.telefone || '').replace(/\D/g, '')
    const buscaLimpa = busca.replace(/\D/g, '')
    return (
      c.nome.toLowerCase().includes(q) ||
      (buscaLimpa.length > 0 && telLimpo.includes(buscaLimpa))
    )
  })

  function selecionar(c) {
    onChange(c.id)
    setBusca('')
    setAberto(false)
  }

  function abrir() {
    setAberto(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Campo principal */}
      <div
        onClick={abrir}
        className={`input flex items-center justify-between cursor-pointer ${!selecionado ? 'text-gray-400' : 'text-gray-800'}`}>
        <span className="truncate">
          {selecionado
            ? <span>{selecionado.nome} {selecionado.telefone && <span className="text-gray-400 text-xs ml-1">— {selecionado.telefone}</span>}</span>
            : 'Selecione o cliente *'}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selecionado && (
            <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setBusca('') }}
              className="text-gray-300 hover:text-red-400 transition text-sm">✕</button>
          )}
          <span className="text-gray-400 text-xs">{aberto ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-2xl shadow-2xl mt-1 overflow-hidden">
          {/* Campo de busca */}
          <div className="p-3 border-b border-gray-100 bg-blue-50">
            <input
              ref={inputRef}
              placeholder="🔍 Buscar por nome ou telefone..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input text-sm bg-white"
            />
            <p className="text-xs text-gray-400 mt-1.5 px-1">
              {filtrados.length} cliente(s) encontrado(s)
            </p>
          </div>

          {/* Lista */}
          <div className="max-h-64 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="p-4 text-center text-gray-400 text-sm">Nenhum cliente encontrado</p>
            ) : (
              filtrados.map(c => (
                <button key={c.id} type="button" onClick={() => selecionar(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 flex items-center justify-between gap-2
                    ${value === c.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
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
