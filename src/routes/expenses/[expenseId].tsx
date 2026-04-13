import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EXPENSE_STATUS_INFO, EXPENSE_SOURCE_INFO } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/common/Toast'
import type { Expense, ExpenseItem } from '@/lib/types'
import { ArrowLeft, CheckCircle, AlertTriangle, Truck } from 'lucide-react'

export function ExpenseDetailPage() {
  const { expenseId } = useParams()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (expenseId) loadExpense() }, [expenseId])

  const loadExpense = async () => {
    const { data } = await supabase.from('expenses').select('*, supplier:suppliers(*)').eq('id', expenseId!).single()
    if (data) setExpense(data)
    const { data: expItems } = await supabase.from('expense_items').select('*').eq('expense_id', expenseId!)
    if (expItems) setItems(expItems)
    setLoading(false)
  }

  const updateStatus = async (status: string) => {
    if (!expense) return
    const { error } = await supabase.from('expenses').update({ status }).eq('id', expense.id)
    if (error) toast(error.message, 'error')
    else { toast('Statut mis à jour', 'success'); loadExpense() }
  }

  if (loading) return <div className="text-center py-8 text-surface-500">Chargement...</div>
  if (!expense) return <div className="text-center py-8 text-surface-500">Dépense introuvable.</div>

  const si = EXPENSE_STATUS_INFO[expense.status]
  const src = EXPENSE_SOURCE_INFO[expense.source]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/expenses" className="text-surface-600 hover:text-surface-900"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{expense.invoice_number || 'Dépense'}</h1>
              <StatusBadge label={si.label} color={si.color} />
              <StatusBadge label={src.label} color={src.color} />
            </div>
            <p className="text-sm text-surface-600 mt-1">
              {expense.supplier?.name ?? 'Fournisseur non renseigné'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {expense.status === 'a_payer' && (
            <>
              <button onClick={() => updateStatus('paye')} className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700">
                <CheckCircle className="h-4 w-4" /> Marquer payé
              </button>
              <button onClick={() => updateStatus('en_litige')} className="inline-flex items-center gap-2 rounded-lg border border-error-300 px-4 py-2 text-sm font-medium text-error-600 hover:bg-error-50">
                <AlertTriangle className="h-4 w-4" /> En litige
              </button>
            </>
          )}
          {expense.status === 'en_litige' && (
            <button onClick={() => updateStatus('a_payer')} className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
              Remettre à payer
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-surface-500">Date facture</p>
            <p className="font-medium text-surface-900">{formatDate(expense.issue_date)}</p>
          </div>
          {expense.due_date && (
            <div>
              <p className="text-surface-500">Échéance</p>
              <p className="font-medium text-surface-900">{formatDate(expense.due_date)}</p>
            </div>
          )}
          {expense.supplier && (
            <div>
              <p className="text-surface-500">Fournisseur</p>
              <p className="font-medium text-surface-900 flex items-center gap-1">
                <Truck className="h-3 w-3" /> {expense.supplier.name}
              </p>
            </div>
          )}
        </div>

        {/* Items table */}
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
                <td className="py-3 font-medium text-surface-900">{item.description}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(item.unit_price_ht)}</td>
                <td className="py-3 text-right">{item.tva_rate} %</td>
                <td className="py-3 text-right font-medium">{formatCurrency(item.total_ht)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span>HT</span><span className="font-medium">{formatCurrency(expense.subtotal_ht)}</span></div>
            <div className="flex justify-between"><span>TVA</span><span>{formatCurrency(expense.total_tva)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>TTC</span><span>{formatCurrency(expense.total_ttc)}</span></div>
          </div>
        </div>

        {expense.notes && (
          <div className="border-t border-surface-200 pt-4">
            <p className="text-sm text-surface-600">{expense.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
