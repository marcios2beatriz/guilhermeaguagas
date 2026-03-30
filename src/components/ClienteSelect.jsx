import { useState, useRef, useEffect } from 'react'

export default function ClienteSelect({ clientes, value, onChange, required }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef()

  const selecionado = clientes.find(c => c.id === value)

  useEffect(() => {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  ).slice(0, 8)

  function selecionar(c) {
    onChange(c.id)
    setBusca('')
    setAberto(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div
        className={`input flex items-center justify-between cursor-pointer ${!selecionado ? 'text-gray-400' : 'text-gray-800'}`}
        onClick={() => setAberto(!aberto)}>
        <span>{selecionado ? selecionado.nome : 'Selecione o cliente *'}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </div>

      {aberto && (
        <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-2xl shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus placeholder="Buscar por nome ou telefone..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="input text-sm" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtrados.map(c => (
              <button key={c.id} type="button" onClick={() => selecionar(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition text-sm border-b border-gray-50 last:border-0">
                <p className="font-semibold text-gray-800">{c.nome}</p>
                {c.telefone && <p className="text-xs text-gray-400">{c.telefone}</p>}
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="p-4 text-center text-gray-400 text-sm">Nenhum cliente encontrado</p>
            )}
          </div>
        </div>
      )}
      {required && <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} />}
    </div>
  )
}
