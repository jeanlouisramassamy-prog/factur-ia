import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { formatCurrency, todayISO } from '@/lib/utils'
import type { Supplier, ExpenseItemDraft } from '@/lib/types'
import type { ParsedFacturX } from '@/lib/facturx-parser'
import { ArrowLeft, Save, Plus, Trash2, Zap } from 'lucide-react'

function emptyItem(): ExpenseItemDraft {
  return { description: '', quantity: 1, unit_price_ht: 0, total_ht: 0, tva_rate: 20, pcg_account: null }
}

export function ExpenseNewPage() {
  const { business } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isImport = searchParams.get('source') === 'facturx'

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)

  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState<'manuel' | 'facturx_import'>('manuel')
  const [items, setItems] = useState<ExpenseItemDraft[]>([emptyItem()])
  const [importedXml, setImportedXml] = useState<string | null>(null)
  const [pendingSupplier, setPendingSupplier] = useState<{ name: string; siret: string | null; vat_number: string | null } | null>(null)
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  useEffect(() => {
    if (business) {
      supabase.from('suppliers').select('*').eq('business_id', business.id).order('name')
        .then(({ data }) => { if (data) setSuppliers(data) })
    }
  }, [business])

  // Load Factur-X import data
  useEffect(() => {
    if (!isImport) return
    const raw = sessionStorage.getItem('facturx_import')
    if (!raw) return
    sessionStorage.removeItem('facturx_import')

    const parsed: ParsedFacturX = JSON.parse(raw)
    setSource('facturx_import')
    setInvoiceNumber(parsed.invoiceNumber)
    setIssueDate(parsed.issueDate || todayISO())
    if (parsed.dueDate) setDueDate(parsed.dueDate)
    setImportedXml(parsed.rawXml)

    // Try to match supplier by SIRET, else offer creation
    if (parsed.supplierSiret) {
      const match = suppliers.find((s) => s.siret === parsed.supplierSiret)
      if (match) {
        setSupplierId(match.id)
      } else if (parsed.supplierName) {
        setPendingSupplier({
          name: parsed.supplierName,
          siret: parsed.supplierSiret,
          vat_number: parsed.supplierVatNumber,
        })
      }
    } else if (parsed.supplierName) {
      // No SIRET — try to match by name
      const match = suppliers.find((s) => s.name.toLowerCase() === parsed.supplierName.toLowerCase())
      if (match) setSupplierId(match.id)
      else setPendingSupplier({ name: parsed.supplierName, siret: null, vat_number: parsed.supplierVatNumber })
    }

    // Set items from parsed lines
    if (parsed.lines.length > 0) {
      setItems(parsed.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_ht: l.unitPriceHT,
        total_ht: l.totalHT,
        tva_rate: l.tvaRate,
        pcg_account: null,
      })))
    } else {
      // No lines — use totals
      setItems([{
        description: `Facture ${parsed.invoiceNumber} — ${parsed.supplierName}`,
        quantity: 1,
        unit_price_ht: parsed.totalHT,
        total_ht: parsed.totalHT,
        tva_rate: parsed.totalHT > 0 ? (parsed.totalTVA / parsed.totalHT) * 100 : 0,
        pcg_account: null,
      }])
    }
  }, [isImport, suppliers])

  const updateItem = (i: number, u: Partial<ExpenseItemDraft>) => {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, ...u }
      updated.total_ht = Math.round(updated.quantity * updated.unit_price_ht * 100) / 100
      return updated
    }))
  }
  const addItem = () => setItems((p) => [...p, emptyItem()])
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i))

  const totals = useMemo(() => {
    let ht = 0, tva = 0
    items.forEach((it) => { ht += it.total_ht; tva += Math.round(it.total_ht * (it.tva_rate / 100) * 100) / 100 })
    return { ht, tva, ttc: ht + tva }
  }, [items])

  const handleSave = async () => {
    if (!business) return
    if (items.some((it) => !it.description)) { toast('Chaque ligne doit avoir une description.', 'error'); return }
    setSaving(true)

    const { data: expense, error } = await supabase.from('expenses').insert({
      business_id: business.id,
      supplier_id: supplierId || null,
      invoice_number: invoiceNumber || null,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal_ht: totals.ht,
      total_tva: totals.tva,
      total_ttc: totals.ttc,
      source,
      xml_data: importedXml ? { raw: importedXml } : null,
      notes: notes || null,
    }).select().single()

    if (error || !expense) { toast(error?.message ?? 'Erreur', 'error'); setSaving(false); return }

    await supabase.from('expense_items').insert(items.map((it) => ({
      expense_id: expense.id,
      description: it.description,
      quantity: it.quantity,
      unit_price_ht: it.unit_price_ht,
      total_ht: it.total_ht,
      tva_rate: it.tva_rate,
      total_tva: Math.round(it.total_ht * (it.tva_rate / 100) * 100) / 100,
      pcg_account: it.pcg_account,
    })))

    toast('Dépense créée', 'success')
    setSaving(false)
    navigate(`/app/expenses/${expense.id}`)
  }

  const handleCreateSupplier = async () => {
    if (!business || !pendingSupplier) return
    setCreatingSupplier(true)
    const { data, error } = await supabase.from('suppliers').insert({
      business_id: business.id,
      name: pendingSupplier.name,
      siret: pendingSupplier.siret,
      vat_number: pendingSupplier.vat_number,
    }).select().single()
    setCreatingSupplier(false)
    if (error || !data) {
      toast(error?.message ?? 'Erreur création fournisseur', 'error')
      return
    }
    setSuppliers((prev) => [...prev, data])
    setSupplierId(data.id)
    setPendingSupplier(null)
    toast(`Fournisseur "${data.name}" créé`, 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/app/expenses')} className="text-surface-600 hover:text-surface-900"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold text-surface-900">Nouvelle dépense</h1>
        {source === 'facturx_import' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
            <Zap className="h-3 w-3" /> Auto-importé Factur-X
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Fournisseur</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm outline-none">
                <option value="">Sélectionner un fournisseur...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {pendingSupplier && !supplierId && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-primary-900">{pendingSupplier.name}</p>
                    <p className="text-xs text-primary-700">
                      {pendingSupplier.siret ? `SIRET : ${pendingSupplier.siret}` : 'SIRET non fourni'}
                      {pendingSupplier.vat_number ? ` · TVA : ${pendingSupplier.vat_number}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSupplier}
                    disabled={creatingSupplier}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    {creatingSupplier ? 'Création...' : 'Créer ce fournisseur'}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">N° facture fournisseur</label>
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Date facture</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Échéance</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <h3 className="font-semibold text-surface-900">Lignes</h3>
            {items.map((item, index) => (
              <div key={index} className="border border-surface-200 rounded-lg p-4 space-y-3">
                <input type="text" value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" placeholder="Description *" />
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">Qté</label>
                    <input type="number" step="0.001" min="0" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">Prix HT</label>
                    <input type="number" step="0.01" min="0" value={item.unit_price_ht} onChange={(e) => updateItem(index, { unit_price_ht: Number(e.target.value) })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">TVA %</label>
                    <input type="number" step="0.1" min="0" value={item.tva_rate} onChange={(e) => updateItem(index, { tva_rate: Number(e.target.value) })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">Total HT</label>
                    <p className="text-sm font-semibold py-1.5">{formatCurrency(item.total_ht)}</p>
                  </div>
                  <div className="flex items-end">
                    {items.length > 1 && <button onClick={() => removeItem(index)} className="p-1.5 text-error-500 hover:bg-error-50 rounded"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addItem} className="text-sm text-primary-600 font-medium"><Plus className="h-4 w-4 inline mr-1" />Ajouter</button>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" rows={2} />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 sticky top-6 h-fit space-y-4">
          <h3 className="font-semibold text-surface-900">Récapitulatif</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-600">HT</span><span className="font-medium">{formatCurrency(totals.ht)}</span></div>
            <div className="flex justify-between"><span className="text-surface-600">TVA</span><span className="font-medium">{formatCurrency(totals.tva)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">TTC</span><span className="font-bold">{formatCurrency(totals.ttc)}</span></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            <Save className="h-4 w-4 inline mr-2" />{saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
