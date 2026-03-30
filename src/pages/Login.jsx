import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [form, setForm] = useState({ email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.senha,
    })
    if (error) setErro('Email ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-blue-800 p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-700 rounded-full opacity-50" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] bg-blue-900 rounded-full opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600 rounded-full opacity-20" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/galao.png" alt="Galão" className="w-12 h-12 object-contain bg-white rounded-full p-1 flex-shrink-0" />
          <div className="text-center flex-1">
            <p className="text-white text-2xl font-bold leading-tight">Guilherme</p>
            <p className="text-blue-200 text-lg font-semibold">Água e Gás</p>
          </div>
          <img src="/botijao.png" alt="Botijão" className="w-12 h-12 object-contain bg-white rounded-full p-1 flex-shrink-0" />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-white text-4xl font-bold leading-tight">
            Gerencie seu negócio<br />com simplicidade
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed">
            Controle de clientes, vendas, estoque, fiado e fluxo de caixa em um só lugar.
          </p>
          <div className="flex flex-col gap-3">
            {['Cadastro de clientes e produtos', 'Controle de fiado em tempo real', 'Dashboard com visão completa', 'CRM para fidelizar clientes'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-blue-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-300 text-xs">© {new Date().getFullYear()} Guilherme Água e Gás</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-blue-50 px-6 py-12 relative overflow-hidden">
        {/* Marca d'água fundo */}
        <img src="/galao.png" alt="" className="absolute -bottom-10 -left-10 w-72 h-72 object-contain opacity-5 rotate-[-15deg] pointer-events-none select-none" />
        <img src="/botijao.png" alt="" className="absolute -top-10 -right-10 w-72 h-72 object-contain opacity-5 rotate-[15deg] pointer-events-none select-none" />
        <img src="/galao.png" alt="" className="absolute top-1/2 left-4 w-40 h-40 object-contain opacity-[0.04] -translate-y-1/2 pointer-events-none select-none" />
        <img src="/botijao.png" alt="" className="absolute top-1/3 right-8 w-32 h-32 object-contain opacity-[0.04] pointer-events-none select-none" />
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3">
              <img src="/galao.png" alt="Galão" className="w-12 h-12 object-contain bg-white rounded-full p-1" />
              <div>
                <h1 className="text-xl font-bold text-blue-800">Guilherme</h1>
                <p className="text-blue-500 font-semibold text-sm">Água e Gás</p>
              </div>
              <img src="/botijao.png" alt="Botijão" className="w-12 h-12 object-contain bg-white rounded-full p-1" />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Bem-vindo de volta!</h2>
              <p className="text-gray-400 text-sm mt-1">Entre com suas credenciais para acessar o sistema.</p>
            </div>

            <form onSubmit={entrar} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                <input type="email" required placeholder="seu@email.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} className="input text-base" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Senha</label>
                <input type="password" required placeholder="••••••••" value={form.senha}
                  onChange={e => setForm({ ...form, senha: e.target.value })} className="input text-base" />
              </div>

              {erro && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-500 text-sm">⚠️ {erro}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 text-sm mt-2">
                {loading ? 'Entrando...' : 'Entrar no sistema →'}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 space-y-1">
            <p className="text-xs font-semibold text-gray-500">© {new Date().getFullYear()} Guilherme Água e Gás. Todos os direitos reservados.</p>
            <p className="text-xs text-gray-400">Desenvolvido por Juveniciu's Tech Soluções Automatizadas™</p>
            <p className="text-xs text-gray-400">✉ m.marcio.soares@hotmail.com</p>
            <p className="text-xs text-gray-400">📞 (83) 98666-6562</p>
          </div>
        </div>
      </div>
    </div>
  )
}
