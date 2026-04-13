import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Receipt,
  Truck,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: 'invoices', icon: FileText, label: 'Factures' },
  { to: 'quotes', icon: FileCheck, label: 'Devis' },
  { to: 'expenses', icon: Receipt, label: 'Dépenses' },
  { to: 'clients', icon: Users, label: 'Clients' },
  { to: 'suppliers', icon: Truck, label: 'Fournisseurs' },
  { to: 'products', icon: Package, label: 'Produits' },
  { to: 'settings', icon: Settings, label: 'Paramètres' },
]

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile, business, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-surface-200 bg-white">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-surface-200">
          <Zap className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-surface-900">
            Factur<span className="text-primary-600">IA</span>
          </span>
        </div>

        {business && (
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="text-sm font-medium text-surface-900 truncate">
              {business.business_name}
            </p>
            <p className="text-xs text-surface-500 truncate">
              {business.siret || 'SIRET non renseigné'}
            </p>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700">
              {profile?.first_name?.charAt(0) ?? ''}
              {profile?.last_name?.charAt(0) ?? ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-surface-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 hover:text-surface-900"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-surface-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-surface-900">
              Factur<span className="text-primary-600">IA</span>
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-surface-600 hover:text-surface-900"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile overlay nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute top-14 left-0 right-0 bg-white border-b border-surface-200 shadow-lg animate-slideDown">
              <nav className="px-4 py-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-surface-600 hover:bg-surface-100'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                ))}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
                >
                  <LogOut className="h-5 w-5" />
                  Déconnexion
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
