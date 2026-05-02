import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import {
  LayoutDashboard, Users, ShoppingCart, Package,
  Wallet, ClipboardList, History, TrendingUp, Truck, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import Clientes from './pages/Clientes'
import Vendas from './pages/Vendas'
import Fiado from './pages/Fiado'
import FluxoCaixa from './pages/FluxoCaixa'
import Produtos from './pages/Produtos'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Login from './pages/Login'
import Historico from './pages/Historico'
import Abastecimento from './pages/Abastecimento'

const menu = [
  { to: '/', label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/clientes',     label: 'Clientes',      icon: Users },
  { to: '/vendas',       label: 'Vendas',         icon: ShoppingCart },
  { to: '/produtos',     label: 'Mercadorias',    icon: Package },
  { to: '/fluxo',        label: 'Caixa',          icon: Wallet },
  { to: '/fiado',        label: 'Fiado',          icon: ClipboardList },
  { to: '/historico',    label: 'Histórico',      icon: History },
  { to: '/crm',          label: 'CRM',            icon: TrendingUp },
  { to: '/abastecimento',label: 'Abastecimento',  icon: Truck },
]

// Wrapper com animação de entrada
function AnimatedPage({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  )
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img src="/galao.png" alt="" className="w-16 h-16 object-contain animate-bounce" />
        <p className="text-blue-400 text-sm font-semibold">Carregando...</p>
      </div>
    </div>
  )

  if (!sessao) return <Login />

  // const emailBloqueado = 'gsguilherme120@hotmail.com'

  async function sair() { await supabase.auth.signOut() }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-blue-50">

        {/* Sidebar desktop */}
        <aside className={`hidden md:flex flex-col bg-blue-800 transition-all duration-300 shadow-xl ${collapsed ? 'w-16' : 'w-60'}`}>
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 py-4 border-b border-blue-700">
            <img src="/galao.png" alt="Galão" className="w-8 h-8 object-contain bg-white rounded-full flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 text-center">
                <p className="font-black text-base leading-tight text-white tracking-wide">Guilherme</p>
                <p className="text-xs font-bold bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent tracking-widest uppercase">Água e Gás</p>
                <p className="text-[9px] text-blue-300 mt-0.5 tracking-wider">Sistema de Gestão</p>
              </div>
            )}
            {!collapsed && <img src="/botijao.png" alt="Botijão" className="w-8 h-8 object-contain bg-white rounded-full flex-shrink-0" />}
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 p-2 flex-1">
            {menu.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${isActive
                    ? 'bg-white text-blue-800 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`
                }>
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Toggle */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="m-3 p-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-blue-100 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 text-xs">
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Recolher</span></>}
          </button>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-blue-100 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <img src="/galao.png" alt="Galão" className="w-9 h-9 object-contain bg-white rounded-full drop-shadow" />
              <div className="border-l-2 border-blue-100 pl-3">
                <h1 className="text-base font-black text-blue-900 leading-tight tracking-wide">
                  Guilherme <span className="text-shimmer">Água e Gás</span>
                </h1>
                <p className="text-[10px] text-gray-400 tracking-widest uppercase font-semibold">Sistema de Gestão</p>
              </div>
              <img src="/botijao.png" alt="Botijão" className="w-9 h-9 object-contain bg-white rounded-full drop-shadow" />
            </div>
            <button onClick={sair}
              className="flex items-center gap-1.5 text-xs bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-all duration-200 font-semibold hover:scale-105 active:scale-95">
              <LogOut size={13} /> Sair
            </button>
          </header>

          <main className="flex-1 p-4 overflow-auto pb-24 md:pb-4">
            <Routes>
              <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/clientes" element={<AnimatedPage><Clientes /></AnimatedPage>} />
              <Route path="/crm" element={<AnimatedPage><CRM /></AnimatedPage>} />
              <Route path="/produtos" element={<AnimatedPage><Produtos /></AnimatedPage>} />
              <Route path="/vendas" element={<AnimatedPage><Vendas /></AnimatedPage>} />
              <Route path="/fiado" element={<AnimatedPage><Fiado /></AnimatedPage>} />
              <Route path="/fluxo" element={<AnimatedPage><FluxoCaixa /></AnimatedPage>} />
              <Route path="/historico" element={<AnimatedPage><Historico /></AnimatedPage>} />
              <Route path="/abastecimento" element={<AnimatedPage><Abastecimento /></AnimatedPage>} />
            </Routes>
          </main>
        </div>

        {/* Bottom nav mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-800 border-t border-blue-700 flex z-50">
          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-xs transition-all duration-200
                ${isActive ? 'text-white font-bold bg-blue-900' : 'text-blue-300 hover:text-white'}`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'scale-110' : ''} />
                  <span className="text-[9px] mt-0.5 leading-tight text-center">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  )
}
