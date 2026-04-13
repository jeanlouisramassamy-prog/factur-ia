import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { EXPENSE_STATUS_INFO, EXPENSE_SOURCE_INFO } from '@/lib/types'
import type { Expense, ExpenseStatus } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/common/Toast'
import { extractFacturXFromFile, parseFacturXml } from '@/lib/facturx-parser'
import { Receipt, Plus, Search, Filter, Upload } from 'lucide-react'

export function ExpensesListPage() {
  const { business } = useAuthStore()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all')
  const [importing, setImporting] = useState(false)

  useEffect(() => { if (business) loadExpenses() }, [business])

  const loadExpenses = async () => {
    if (!business) return
    const { data } = await supabase
      .from('expenses')
      .select('*, supplier:suppliers(*)')
      .eq('business_id', business.id)
      .order('issue_date', { ascending: false })
    if (data) setExpenses(data)
    setLoading(false)
  }

  const handleFileImport = useCallback(async (file: File) => {
    setImporting(true)
    const xmlString = await extractFacturXFromFile(file)

    if (!xmlString) {
      toast('Ce fichier ne contient pas de données Factur-X. Saisie manuelle.', 'warning')
      setImporting(false)
      navigate('/app/expenses/new')
      return
    }

    const parsed = parseFacturXml(xmlString)
    if (!parsed) {
      toast('Erreur lors du parsing du XML Factur-X.', 'error')
      setImporting(false)
      return
    }

    // Store parsed data in sessionStorage for the new expense form
    sessionStorage.setItem('facturx_import', JSON.stringify(parsed))
    setImporting(false)
    toast(`Facture ${parsed.invoiceNumber} de ${parsed.supplierName} importée !`, 'success')
    navigate('/app/expenses/new?source=facturx')
  }, [navigate])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileImport(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileImport(file)
  }

  const filtered = expenses.filter((exp) => {
    if (statusFilter !== 'all' && exp.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        exp.invoice_number?.toLowerCase().includes(q) ||
        exp.supplier?.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Dépenses</h1>
        <Link to="/app/expenses/new" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </Link>
      </div>

      {/* Import zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-primary-300 rounded-xl p-6 text-center bg-primary-50/50 hover:bg-primary-50 transition-colors cursor-pointer"
      >
        <label className="cursor-pointer">
          <input type="file" accept=".pdf,.xml" onChange={handleFileInput} className="hidden" />
          <div className="flex flex-col items-center gap-2">
            <Upload className={`h-8 w-8 text-primary-500 ${importing ? 'animate-spin' : ''}`} />
            <p className="font-semibold text-surface-900">
              {importing ? 'Import en cours...' : 'Déposer une facture fournisseur'}
            </p>
            <p className="text-sm text-surface-500">
              Format Factur-X (PDF ou XML) — les données seront extraites automatiquement
            </p>
          </div>
        </label>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 outline-none bg-white" placeholder="Rechercher..." />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'all')} className="rounded-lg border border-surface-300 pl-10 pr-8 py-2.5 text-sm outline-none bg-white appearance-none">
            <option value="all">Tous les statuts</option>
            {Object.entries(EXPENSE_STATUS_INFO).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">Aucune dépense.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((exp) => {
              const si = EXPENSE_STATUS_INFO[exp.status]
              const src = EXPENSE_SOURCE_INFO[exp.source]
              return (
                <Link key={exp.id} to={`/app/expenses/${exp.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-900">{exp.invoice_number || 'Sans numéro'}</p>
                      <StatusBadge label={src.label} color={src.color} />
                    </div>
                    <p className="text-xs text-surface-500">{exp.supplier?.name ?? 'Fournisseur inconnu'} · {formatDateShort(exp.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge label={si.label} color={si.color} />
                    <span className="text-sm font-semibold text-surface-900 w-24 text-right">{formatCurrency(exp.total_ttc)}</span>
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
