import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { logout, getSession } from '../lib/auth'

const SECTIONS = [
  {
    id: 'listening',
    label: 'Listening',
    path: '/dashboard/listening',
    icon: '🎧',
    active: true,
    color: 'indigo',
  },
  {
    id: 'speaking',
    label: 'Speaking',
    path: '/dashboard/speaking',
    icon: '🎤',
    active: false,
    color: 'emerald',
  },
  {
    id: 'reading',
    label: 'Reading',
    path: '/dashboard/reading',
    icon: '📖',
    active: false,
    color: 'amber',
  },
  {
    id: 'writing',
    label: 'Writing',
    path: '/dashboard/writing',
    icon: '✍️',
    active: false,
    color: 'rose',
  },
]

const LISTENING_NAV = [
  { label: 'Overview', path: '/dashboard/listening', icon: '📊', exact: true },
  { label: 'Materials Library', path: '/dashboard/listening/materials', icon: '📚' },
  { label: 'Add Material', path: '/dashboard/listening/add', icon: '➕' },
  { label: 'Generate with AI', path: '/dashboard/listening/generate', icon: '🤖' },
  { label: 'Classroom Mode', path: '/dashboard/listening/classroom', icon: '🖥️' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
  const isListening = location.pathname.startsWith('/dashboard/listening')
  const isClassroom = location.pathname.includes('/classroom/')

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (isClassroom) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header */}
      <header className="bg-brand-800 text-white shadow-lg z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold leading-none">QC TOEFL Practice</h1>
              <p className="text-brand-200 text-xs mt-0.5">Teacher Portal</p>
            </div>
          </div>

          {/* Section tabs */}
          <nav className="flex items-center gap-1">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.id}
                to={s.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-brand-800'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`
                }
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                {!s.active && (
                  <span className="text-xs text-brand-300 font-normal">(soon)</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-brand-200 text-sm">
              👤 {session?.user}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-brand-200 hover:text-white border border-brand-600 hover:border-brand-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar — Listening sub-nav */}
        {isListening && (
          <aside className="w-56 bg-white border-r border-slate-200 flex flex-col py-4 gap-1 px-2 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Listening
            </p>
            {LISTENING_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 border border-brand-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
