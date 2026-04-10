import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getClientDisplayName } from '@/lib/utils'
import { QUOTE_STATUS_INFO } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/common/Toast'
import type { Quote, QuoteItem } from '@/lib/types'
import { ArrowLeft, FileText, CheckCircle, XCircle } from 'lucide-react'

export function QuoteDetailPage() {
  const { quoteId } = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (quoteId) loadQuote() }, [quoteId])

  const loadQuote = async () => {
    const { data } = await supabase.from('quotes').select('*, client:clients(*)').eq('id', quoteId!).single()
    if (data) setQuote(data)
    const { data: qItems } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId!).order('sort_order')
    if (qItems) setItems(qItems)
    setLoading(false)
  }

  const updateStatus = async (status: string) => {
    if (!quote) return
    const { error } = await supabase.from('quotes').update({ status }).eq('id', quote.id)
    if (error) toast(error.message, 'error')
    else { toast('Statut mis à jour', 'success'); loadQuote() }
  }

  const convertToInvoice = async () => {
    toast('Conversion en facture — fonctionnalité à venir', 'info')
    // In a full implementation: create invoice from quote items, link via converted_invoice_id
  }

  if (loading) return <div className="text-center py-8 text-surface-500">Chargement...</div>
  if (!quote) return <div className="text-center py-8 text-surface-500">Devis introuvable.</div>

  const si = QUOTE_STATUS_INFO[quote.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/quotes" className="text-surface-600 hover:text-surface-900"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{quote.quote_number}</h1>
              <StatusBadge label={si.label} color={si.color} />
            </div>
            <p className="text-sm text-surface-600 mt-1">{quote.client ? getClientDisplayName(quote.client) : '—'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === 'sent' && (
            <>
              <button onClick={() => updateStatus('accepted')} className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700">
                <CheckCircle className="h-4 w-4" /> Accepté
              </button>
              <button onClick={() => updateStatus('rejected')} className="inline-flex items-center gap-2 rounded-lg border border-error-300 px-4 py-2 text-sm font-medium text-error-600 hover:bg-error-50">
                <XCircle className="h-4 w-4" /> Refusé
              </button>
            </>
          )}
          {quote.status === 'accepted' && !quote.converted_invoice_id && (
            <button onClick={convertToInvoice} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <FileText className="h-4 w-4" /> Convertir en facture
            </button>
          )}
          {quote.status === 'draft' && (
            <button onClick={() => updateStatus('sent')} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Marquer envoyé
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-surface-500">Date</p><p className="font-medium">{formatDate(quote.issue_date)}</p></div>
          <div><p className="text-surface-500">Validité</p><p className="font-medium">{quote.validity_days} jours</p></div>
          <div><p className="text-surface-500">Total TTC</p><p className="font-bold text-lg">{formatCurrency(quote.total_ttc)}</p></div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-left">
              <th className="pb-2 font-medium text-surface-500">Description</th>
              <th className="pb-2 font-medium text-surface-500 text-right">Qté</th>
              <th className="pb-2 font-medium text-surface-500 text-right">Prix HT</th>
              <th className="pb-2 font-medium text-surface-500 text-right">TVA</th>
              <th className="pb-2 font-medium text-surface-500 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-surface-100">
                <td className="py-3 font-medium text-surface-900">{it.description}</td>
                <td className="py-3 text-right">{it.quantity} {it.unit}</td>
                <td className="py-3 text-right">{formatCurrency(it.unit_price_ht)}</td>
                <td className="py-3 text-right">{it.tva_rate}%</td>
                <td className="py-3 text-right font-medium">{formatCurrency(it.total_ht)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span>HT</span><span className="font-medium">{formatCurrency(quote.subtotal_ht)}</span></div>
            <div className="flex justify-between"><span>TVA</span><span>{formatCurrency(quote.total_tva)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>TTC</span><span>{formatCurrency(quote.total_ttc)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
