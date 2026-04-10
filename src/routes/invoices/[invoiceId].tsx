import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getClientDisplayName } from '@/lib/utils'
import { INVOICE_STATUS_INFO, PAYMENT_METHODS } from '@/lib/types'
import { LEGAL_MENTIONS } from '@/lib/french-tax'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/common/Toast'
import type { Invoice, InvoiceItem } from '@/lib/types'
import { ArrowLeft, Download, Send, CheckCircle, Shield } from 'lucide-react'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (invoiceId) loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId!)
      .single()
    if (data) setInvoice(data)

    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId!)
      .order('sort_order')
    if (itemsData) setItems(itemsData)

    setLoading(false)
  }

  const markAsPaid = async () => {
    if (!invoice) return
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Facture marquée comme payée', 'success')
      loadInvoice()
    }
  }

  const markAsSent = async () => {
    if (!invoice) return
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoice.id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Facture marquée comme envoyée', 'success')
      loadInvoice()
    }
  }

  if (loading) return <div className="text-center py-8 text-surface-500">Chargement...</div>
  if (!invoice) return <div className="text-center py-8 text-surface-500">Facture introuvable.</div>

  const si = INVOICE_STATUS_INFO[invoice.status]
  const pm = PAYMENT_METHODS.find((m) => m.value === invoice.payment_method)

  // Group TVA
  const tvaGroups = new Map<number, { base: number; tva: number }>()
  items.forEach((item) => {
    const existing = tvaGroups.get(item.tva_rate) ?? { base: 0, tva: 0 }
    existing.base += item.total_ht
    existing.tva += item.total_ttc - item.total_ht
    tvaGroups.set(item.tva_rate, existing)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/invoices" className="text-surface-600 hover:text-surface-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{invoice.invoice_number}</h1>
              <StatusBadge label={si.label} color={si.color} />
              {invoice.facturx_xml && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  <Shield className="h-3 w-3" /> Factur-X
                </span>
              )}
            </div>
            <p className="text-sm text-surface-600 mt-1">
              {invoice.client ? getClientDisplayName(invoice.client) : '—'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button onClick={markAsSent} className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
              <Send className="h-4 w-4" /> Marquer envoyée
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button onClick={markAsPaid} className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700">
              <CheckCircle className="h-4 w-4" /> Marquer payée
            </button>
          )}
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Download className="h-4 w-4" /> Télécharger PDF
          </button>
        </div>
      </div>

      {/* Invoice details */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        {/* Dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-surface-500">Date d'émission</p>
            <p className="font-medium text-surface-900">{formatDate(invoice.issue_date)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-surface-500">Date d'échéance</p>
              <p className="font-medium text-surface-900">{formatDate(invoice.due_date)}</p>
            </div>
          )}
          {pm && (
            <div>
              <p className="text-surface-500">Mode de paiement</p>
              <p className="font-medium text-surface-900">{pm.label}</p>
            </div>
          )}
          {invoice.paid_at && (
            <div>
              <p className="text-surface-500">Payée le</p>
              <p className="font-medium text-success-600">{formatDate(invoice.paid_at)}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
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
              {items.map((item) => (
                <tr key={item.id} className="border-b border-surface-100">
                  <td className="py-3">
                    <p className="font-medium text-surface-900">{item.description}</p>
                    <p className="text-xs text-surface-400 font-mono">{item.category} · PCG {item.pcg_account || 'N/A'}</p>
                  </td>
                  <td className="py-3 text-right text-surface-700">{item.quantity} {item.unit}</td>
                  <td className="py-3 text-right text-surface-700">{formatCurrency(item.unit_price_ht)}</td>
                  <td className="py-3 text-right text-surface-700">{item.tva_rate} %</td>
                  <td className="py-3 text-right font-medium text-surface-900">{formatCurrency(item.total_ht)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-600">Sous-total HT</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal_ht)}</span>
            </div>
            {Array.from(tvaGroups.entries()).map(([rate, { base, tva }]) => (
              <div key={rate} className="flex justify-between text-surface-500">
                <span>TVA {rate} % (base {formatCurrency(base)})</span>
                <span>{formatCurrency(tva)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-surface-200 pt-2 text-base">
              <span className="font-semibold text-surface-900">Total TTC</span>
              <span className="font-bold text-surface-900">{formatCurrency(invoice.total_ttc)}</span>
            </div>
          </div>
        </div>

        {/* Legal mentions */}
        <div className="border-t border-surface-200 pt-4 text-xs text-surface-500 space-y-1">
          {invoice.total_tva === 0 && <p>{LEGAL_MENTIONS.vat_exempt}</p>}
          <p>{LEGAL_MENTIONS.late_penalty(12.43)}</p>
          <p>{LEGAL_MENTIONS.recovery_indemnity}</p>
          <p>{LEGAL_MENTIONS.escompte_none}</p>
        </div>

        {invoice.notes && (
          <div className="border-t border-surface-200 pt-4">
            <p className="text-sm text-surface-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
