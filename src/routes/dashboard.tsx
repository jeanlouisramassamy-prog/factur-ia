import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort, getClientDisplayName } from '@/lib/utils'
import { MICRO_THRESHOLDS, checkThresholdAlerts } from '@/lib/french-tax'
import { generateFEC, downloadFEC } from '@/lib/fec-export'
import { INVOICE_STATUS_INFO } from '@/lib/types'
import type { Invoice } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/common/Toast'
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  FileDown,
  ArrowRight,
} from 'lucide-react'

export function DashboardPage() {
  const { business } = useAuthStore()
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState({ totalHT: 0, servicesHT: 0, goodsHT: 0, pending: 0, overdue: 0, paidCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) return
    loadData()
  }, [business])

  const loadData = async () => {
    if (!business) return
    setLoading(true)

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear}-12-31`

    // Recent invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (invoices) setRecentInvoices(invoices)

    // Stats from paid invoices this year
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('subtotal_ht, status')
      .eq('business_id', business.id)
      .gte('issue_date', yearStart)
      .lte('issue_date', yearEnd)

    if (paidInvoices) {
      const totalHT = paidInvoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.subtotal_ht), 0)

      const pending = paidInvoices.filter((i) => i.status === 'sent').length
      const overdue = paidInvoices.filter((i) => i.status === 'overdue').length
      const paidCount = paidInvoices.filter((i) => i.status === 'paid').length

      // For activity split we'd need invoice_items, simplified here
      setStats({ totalHT, servicesHT: totalHT, goodsHT: 0, pending, overdue, paidCount })
    }

    setLoading(false)
  }

  const alerts = checkThresholdAlerts(stats.servicesHT, stats.goodsHT)

  const handleExportFEC = async () => {
    if (!business) return
    const year = new Date().getFullYear()
    // Fetch all invoices with items for FEC
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('business_id', business.id)
      .in('status', ['sent', 'paid'])
      .gte('issue_date', `${year}-01-01`)
      .lte('issue_date', `${year}-12-31`)
      .order('issue_date')

    if (!invoices || invoices.length === 0) {
      toast('Aucune facture à exporter pour cette année.', 'warning')
      return
    }

    const fecData = invoices.map((inv) => ({
      ...inv,
      items: inv.items ?? [],
      clientName: inv.client ? getClientDisplayName(inv.client) : 'Client inconnu',
    }))

    const content = generateFEC(fecData, business.business_name)
    downloadFEC(content, `FEC_${business.siret || business.business_name}_${year}.txt`)
    toast('Export FEC téléchargé', 'success')
  }

  const servicesPercent = Math.min((stats.servicesHT / MICRO_THRESHOLDS.services) * 100, 100)
  const goodsPercent = Math.min((stats.goodsHT / MICRO_THRESHOLDS.goods) * 100, 100)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-surface-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Tableau de bord</h1>
          <p className="text-surface-600 mt-1">
            Bonjour, bienvenue sur {business?.business_name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportFEC}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            <FileDown className="h-4 w-4" />
            Export FEC
          </button>
          <Link
            to="/app/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                alert.level === 'exceeded'
                  ? 'bg-error-50 border border-error-200 text-error-700'
                  : alert.level === 'danger'
                  ? 'bg-error-50 border border-error-200 text-error-700'
                  : 'bg-warning-50 border border-warning-200 text-warning-700'
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-surface-600">CA {new Date().getFullYear()}</p>
              <p className="text-xl font-bold text-surface-900">{formatCurrency(stats.totalHT)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-info-500" />
            </div>
            <div>
              <p className="text-sm text-surface-600">Factures payées</p>
              <p className="text-xl font-bold text-surface-900">{stats.paidCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-surface-600">En attente</p>
              <p className="text-xl font-bold text-surface-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-error-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-error-600" />
            </div>
            <div>
              <p className="text-sm text-surface-600">Impayées</p>
              <p className="text-xl font-bold text-surface-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Micro-enterprise thresholds */}
      {business?.legal_form === 'auto_entrepreneur' && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="font-semibold text-surface-900 mb-4">Seuils micro-entreprise</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-surface-600">Services</span>
                <span className="font-medium text-surface-900">
                  {formatCurrency(stats.servicesHT)} / {formatCurrency(MICRO_THRESHOLDS.services)}
                </span>
              </div>
              <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    servicesPercent >= 90 ? 'bg-error-500' : servicesPercent >= 80 ? 'bg-warning-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${servicesPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-surface-600">Marchandises</span>
                <span className="font-medium text-surface-900">
                  {formatCurrency(stats.goodsHT)} / {formatCurrency(MICRO_THRESHOLDS.goods)}
                </span>
              </div>
              <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    goodsPercent >= 90 ? 'bg-error-500' : goodsPercent >= 80 ? 'bg-warning-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${goodsPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent invoices */}
      <div className="bg-white rounded-xl border border-surface-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Dernières factures</h3>
          <Link
            to="/app/invoices"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            Voir tout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-surface-500 text-sm">
            Aucune facture pour le moment.{' '}
            <Link to="/app/invoices/new" className="text-primary-600 hover:underline">
              Créer votre première facture
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {recentInvoices.map((inv) => {
              const statusInfo = INVOICE_STATUS_INFO[inv.status]
              return (
                <Link
                  key={inv.id}
                  to={`/app/invoices/${inv.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-surface-900">
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-surface-500">
                        {inv.client?.company_name || `${inv.client?.first_name ?? ''} ${inv.client?.last_name ?? ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge label={statusInfo.label} color={statusInfo.color} />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-surface-900">
                        {formatCurrency(inv.total_ttc)}
                      </p>
                      <p className="text-xs text-surface-500">
                        {formatDateShort(inv.issue_date)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
