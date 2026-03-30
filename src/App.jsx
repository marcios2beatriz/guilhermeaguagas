import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Clientes from './pages/Clientes'
import Vendas from './pages/Vendas'
import Fiado from './pages/Fiado'
import FluxoCaixa from './pages/FluxoCaixa'
import Produtos from './pages/Produtos'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Login from './pages/Login'
import Historico from './pages/Historico'

const menu = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/crm', label: 'CRM', icon: '📈' },
  { to: '/historico', label: 'Histórico', icon: '📜' },
  { to: '/produtos', label: 'Mercadorias', icon: '📦' },
  { to: '/vendas', label: 'Vendas', icon: '🛒' },
  { to: '/fiado', label: 'Fiado', icon: '📋' },
  { to: '/fluxo', label: 'Caixa', icon: '💰' },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-400 text-sm">Carregando...</div>
  )

  if (!sessao) return <Login />

  async function sair() { await supabase.auth.signOut() }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-blue-50">
        <aside className={`hidden md:flex flex-col bg-blue-800 transition-all duration-300 shadow-xl ${collapsed ? 'w-16' : 'w-60'}`}>
          <div className="flex items-center gap-2 px-3 py-4 border-b border-blue-700">
            <span className="text-3xl">💧</span>
            {!collapsed && (
              <div>
                <p className="font-bold text-sm leading-tight text-white">Guilherme</p>
                <p className="text-xs text-blue-200">Água e Gás</p>
              </div>
            )}
          </div>
          <nav className="flex flex-col gap-1 p-2 flex-1">
            {menu.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive ? 'bg-white text-blue-800 shadow-md font-bold' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`
                }>
                <span className="text-xl">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => setCollapsed(!collapsed)}
            className="m-3 p-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-blue-100 hover:text-white transition text-xs">
            {collapsed ? '→' : '← Recolher'}
          </button>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💧</span>
              <h1 className="text-base font-bold text-blue-800">
                Guilherme <span className="text-blue-500">Água e Gás</span>
              </h1>
            </div>
            <button onClick={sair}
              className="text-xs bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition font-semibold">
              Sair →
            </button>
          </header>

          <main className="flex-1 p-4 overflow-auto pb-24 md:pb-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/fiado" element={<Fiado />} />
              <Route path="/fluxo" element={<FluxoCaixa />} />
            </Routes>
          </main>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-800 border-t border-blue-700 flex z-50">
          {menu.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-xs transition
                ${isActive ? 'text-white font-bold bg-blue-900' : 'text-blue-300 hover:text-white'}`
              }>
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] mt-0.5 leading-tight text-center">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  )
}
