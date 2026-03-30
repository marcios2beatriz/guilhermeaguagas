import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [modo, setModo] = useState('login')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

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

  async function cadastrar(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { data: { nome: form.nome } },
    })
    if (error) {
      setErro('Erro ao cadastrar: ' + error.message)
    } else {
      setSucesso('Cadastro realizado! Verifique seu email para confirmar.')
      setModo('login')
      setForm({ nome: '', email: form.email, senha: '', confirmar: '' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-blue-800 p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-700 rounded-full opacity-50" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] bg-blue-900 rounded-full opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600 rounded-full opacity-20" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-5xl">💧</span>
            <div>
              <p className="text-white text-2xl font-bold leading-tight">Guilherme</p>
              <p className="text-blue-200 text-lg font-semibold">Água e Gás</p>
            </div>
          </div>
        </div>

        {/* Texto central */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-white text-4xl font-bold leading-tight">
            Gerencie seu negócio<br />com simplicidade
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed">
            Controle de clientes, vendas, estoque, fiado e fluxo de caixa em um só lugar.
          </p>
          <div className="flex flex-col gap-3 mt-4">
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

        {/* Rodapé */}
        <div className="relative z-10">
          <p className="text-blue-300 text-xs">© {new Date().getFullYear()} Guilherme Água e Gás</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-blue-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-5xl">💧</span>
            <h1 className="text-2xl font-bold text-blue-800 mt-2">Guilherme Água e Gás</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                {modo === 'login' ? 'Bem-vindo de volta!' : 'Criar nova conta'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {modo === 'login' ? 'Entre com suas credenciais para acessar o sistema.' : 'Preencha os dados para criar sua conta.'}
              </p>
            </div>

            {/* Abas */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
              <button onClick={() => { setModo('login'); setErro(''); setSucesso('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${modo === 'login' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                Entrar
              </button>
              <button onClick={() => { setModo('cadastro'); setErro(''); setSucesso('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${modo === 'cadastro' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                Criar conta
              </button>
            </div>

            {/* Login */}
            {modo === 'login' && (
              <form onSubmit={entrar} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                  <input type="email" required placeholder="seu@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input text-base" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Senha</label>
                  <input type="password" required placeholder="••••••••" value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    className="input text-base" />
                </div>
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-red-500 text-sm">⚠️ {erro}</span>
                  </div>
                )}
                {sucesso && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <span className="text-emerald-600 text-sm">✅ {sucesso}</span>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 text-sm mt-2">
                  {loading ? 'Entrando...' : 'Entrar no sistema →'}
                </button>
              </form>
            )}

            {/* Cadastro */}
            {modo === 'cadastro' && (
              <form onSubmit={cadastrar} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nome</label>
                  <input type="text" required placeholder="Seu nome completo" value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                  <input type="email" required placeholder="seu@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Senha</label>
                  <input type="password" required placeholder="Mínimo 6 caracteres" value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Confirmar senha</label>
                  <input type="password" required placeholder="Repita a senha" value={form.confirmar}
                    onChange={e => setForm({ ...form, confirmar: e.target.value })} className="input" />
                </div>
                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-red-500 text-sm">⚠️ {erro}</span>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 text-sm mt-2">
                  {loading ? 'Cadastrando...' : 'Criar conta →'}
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-6 space-y-1">
            <p className="text-xs font-semibold text-gray-500">© {new Date().getFullYear()} Guilherme Água e Gás. Todos os direitos reservados.</p>
            <p className="text-xs text-gray-400">Desenvolvido por Juveniciu's Tech Soluções Automatizadas™</p>
            <p className="text-xs text-gray-400">✉ m.marcio.soares@hotmail.com</p>
            <p className="text-xs text-gray-400">📞 (83) 9 8862-3431</p>
          </div>
        </div>
      </div>
    </div>
  )
}
