import { useEffect } from 'react'

export default function Toast({ mensagem, tipo = 'sucesso', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const estilos = {
    sucesso: 'bg-emerald-500 text-white',
    erro: 'bg-red-500 text-white',
    info: 'bg-blue-600 text-white',
  }

  const icones = { sucesso: '✅', erro: '❌', info: 'ℹ️' }

  return (
    <div className={`fixed bottom-24 md:bottom-6 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-slide-up ${estilos[tipo]}`}>
      <span>{icones[tipo]}</span>
      <span>{mensagem}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  )
}
