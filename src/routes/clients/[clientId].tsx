import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getClientDisplayName, formatCurrency, formatDateShort } from '@/lib/utils'
import { INVOICE_STATUS_INFO } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { Client, Invoice } from '@/lib/types'
import { ArrowLeft, Mail, Phone, MapPin, Building2 } from 'lucide-react'

export function ClientDetailPage() {
  const { clientId } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clientId) loadClient()
  }, [clientId])

  const loadClient = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId!)
      .single()
    if (data) setClient(data)

    const { data: inv } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId!)
      .order('issue_date', { ascending: false })
    if (inv) setInvoices(inv)

    setLoading(false)
  }

  if (loading) return <div className="text-center py-8 text-surface-500">Chargement...</div>
  if (!client) return <div className="text-center py-8 text-surface-500">Client introuvable.</div>

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total_ttc), 0)

  return (
    <div className="space-y-6">
      <Link to="/app/clients" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux clients
      </Link>

      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h1 className="text-xl font-bold text-surface-900">{getClientDisplayName(client)}</h1>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <Mail className="h-4 w-4" /> {client.email}
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <Phone className="h-4 w-4" /> {client.phone}
            </div>
          )}
          {client.address_line1 && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <MapPin className="h-4 w-4" /> {client.address_line1}, {client.postal_code} {client.city}
            </div>
          )}
          {client.siret && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <Building2 className="h-4 w-4" /> SIRET: {client.siret}
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-surface-100 flex gap-6">
          <div>
            <p className="text-xs text-surface-500">Total facturé</p>
            <p className="text-lg font-bold text-surface-900">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Factures</p>
            <p className="text-lg font-bold text-surface-900">{invoices.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        <div className="px-5 py-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Historique factures</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-surface-500 text-sm">Aucune facture.</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {invoices.map((inv) => {
              const si = INVOICE_STATUS_INFO[inv.status]
              return (
                <Link key={inv.id} to={`/app/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-50">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{inv.invoice_number}</p>
                    <p className="text-xs text-surface-500">{formatDateShort(inv.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={si.label} color={si.color} />
                    <span className="text-sm font-semibold">{formatCurrency(inv.total_ttc)}</span>
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
