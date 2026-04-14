import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDateShort, getClientDisplayName } from '@/lib/utils'
import { INVOICE_STATUS_INFO } from '@/lib/types'
import type { InvoiceStatus } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useInvoices } from '@/hooks/useData'
import { FileText, Plus, Search, Filter } from 'lucide-react'

export function InvoicesListPage() {
  const { business } = useAuthStore()
  const { invoices, loading } = useInvoices(business?.id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const clientName = inv.client ? getClientDisplayName(inv.client) : ''
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Factures</h1>
        <Link
          to="/app/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
            placeholder="Rechercher par numéro ou client..."
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="rounded-lg border border-surface-300 pl-10 pr-8 py-2.5 text-sm focus:border-primary-500 outline-none bg-white appearance-none"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(INVOICE_STATUS_INFO).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">
              {search || statusFilter !== 'all' ? 'Aucune facture trouvée.' : 'Aucune facture.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((inv) => {
              const si = INVOICE_STATUS_INFO[inv.status]
              return (
                <Link
                  key={inv.id}
                  to={`/app/invoices/${inv.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-900">{inv.invoice_number}</p>
                    <p className="text-xs text-surface-500">
                      {inv.client ? getClientDisplayName(inv.client) : '—'} · {formatDateShort(inv.issue_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge label={si.label} color={si.color} />
                    <span className="text-sm font-semibold text-surface-900 w-24 text-right">
                      {formatCurrency(inv.total_ttc)}
                    </span>
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
