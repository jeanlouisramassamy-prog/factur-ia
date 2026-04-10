import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastContainer } from '@/components/common/Toast'
import { AppLayout } from '@/components/layout/AppLayout'

// Auth pages
import { LoginPage } from '@/routes/auth/login'
import { RegisterPage } from '@/routes/auth/register'
import { ResetPasswordPage } from '@/routes/auth/reset-password'

// App pages
import { OnboardingPage } from '@/routes/onboarding'
import { DashboardPage } from '@/routes/dashboard'
import { InvoicesListPage } from '@/routes/invoices/index'
import { InvoiceNewPage } from '@/routes/invoices/new'
import { InvoiceDetailPage } from '@/routes/invoices/[invoiceId]'
import { QuotesListPage } from '@/routes/quotes/index'
import { QuoteNewPage } from '@/routes/quotes/new'
import { QuoteDetailPage } from '@/routes/quotes/[quoteId]'
import { ClientsListPage } from '@/routes/clients/index'
import { ClientDetailPage } from '@/routes/clients/[clientId]'
import { ProductsPage } from '@/routes/products/index'
import { SettingsPage } from '@/routes/settings'
import { LandingPage } from '@/routes/landing'

// --- Guards ---

function LoadingSpinner() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()
  if (!initialized || loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (user) return <Navigate to="/app" replace />
  return <>{children}</>
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { business } = useAuthStore()
  if (!business) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

// --- App ---

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

          {/* App — requires auth + business */}
          <Route
            path="/app"
            element={
              <AuthGuard>
                <OnboardingGuard>
                  <AppLayout />
                </OnboardingGuard>
              </AuthGuard>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="invoices" element={<InvoicesListPage />} />
            <Route path="invoices/new" element={<InvoiceNewPage />} />
            <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="quotes" element={<QuotesListPage />} />
            <Route path="quotes/new" element={<QuoteNewPage />} />
            <Route path="quotes/:quoteId" element={<QuoteDetailPage />} />
            <Route path="clients" element={<ClientsListPage />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
