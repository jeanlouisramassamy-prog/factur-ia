import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort, getClientDisplayName } from '@/lib/utils'
import { QUOTE_STATUS_INFO } from '@/lib/types'
import type { Quote } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { FileCheck, Plus, Search } from 'lucide-react'

export function QuotesListPage() {
  const { business } = useAuthStore()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (business) loadQuotes()
  }, [business])

  const loadQuotes = async () => {
    if (!business) return
    const { data } = await supabase
      .from('quotes')
      .select('*, client:clients(*)')
      .eq('business_id', business.id)
      .order('issue_date', { ascending: false })
    if (data) setQuotes(data)
    setLoading(false)
  }

  const filtered = quotes.filter((q) => {
    if (!search) return true
    const s = search.toLowerCase()
    const cn = q.client ? getClientDisplayName(q.client) : ''
    return q.quote_number.toLowerCase().includes(s) || cn.toLowerCase().includes(s)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Devis</h1>
        <Link
          to="/app/quotes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Nouveau devis
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 outline-none bg-white" placeholder="Rechercher..." />
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">Aucun devis.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((q) => {
              const si = QUOTE_STATUS_INFO[q.status]
              return (
                <Link key={q.id} to={`/app/quotes/${q.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{q.quote_number}</p>
                    <p className="text-xs text-surface-500">{q.client ? getClientDisplayName(q.client) : '—'} · {formatDateShort(q.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge label={si.label} color={si.color} />
                    <span className="text-sm font-semibold text-surface-900 w-24 text-right">{formatCurrency(q.total_ttc)}</span>
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
