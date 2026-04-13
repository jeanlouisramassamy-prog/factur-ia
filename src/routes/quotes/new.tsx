import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { formatCurrency, todayISO, calculateItemTotalHT, calculateItemTVA, getClientDisplayName } from '@/lib/utils'
import { PRODUCT_CATEGORIES, getCategoryById } from '@/lib/product-categories'
import { adaptTVAForTerritoire } from '@/lib/french-tax'
import { ITEM_UNITS } from '@/lib/types'
import type { Client, Product, QuoteItemDraft, ItemUnit } from '@/lib/types'
import { AIDescriptionInput } from '@/components/invoice/AIDescriptionInput'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'

function emptyItem(isExempt: boolean, territoire: string = 'metropole'): QuoteItemDraft {
  const cat = getCategoryById(isExempt ? 'exempt_293b' : 'prestation_generale')!
  const tva = isExempt ? 0 : adaptTVAForTerritoire(cat.tva_rate, territoire as 'metropole' | 'dom')
  return { product_id: null, description: '', quantity: 1, unit: 'unité', unit_price_ht: 0, tva_rate: tva, category: cat.id, activity_type: cat.activity_type, pcg_account: cat.pcg_account, octroi_de_mer: 0, octroi_de_mer_regional: 0 }
}

export function QuoteNewPage() {
  const { business } = useAuthStore()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const isExempt = business?.is_vat_exempt ?? false
  const territoire = business?.territoire ?? 'metropole'

  const [clientId, setClientId] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [validityDays, setValidityDays] = useState(30)
  const [notes] = useState('')
  const [items, setItems] = useState<QuoteItemDraft[]>([emptyItem(isExempt, territoire)])

  useEffect(() => {
    if (!business) return
    supabase.from('clients').select('*').eq('business_id', business.id).order('company_name').then(({ data }) => { if (data) setClients(data) })
    supabase.from('products').select('*').eq('business_id', business.id).eq('is_active', true).order('name').then(({ data }) => { if (data) setProducts(data) })
  }, [business])

  const updateItem = (i: number, u: Partial<QuoteItemDraft>) => setItems((p) => p.map((it, idx) => idx === i ? { ...it, ...u } : it))
  const addItem = () => setItems((p) => [...p, emptyItem(isExempt, territoire)])
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i))

  const selectProduct = (i: number, pid: string) => {
    const p = products.find((x) => x.id === pid)
    if (!p) return
    const cat = getCategoryById(p.category)
    updateItem(i, { product_id: p.id, description: p.name, unit_price_ht: p.default_price_ht ?? 0, unit: p.unit, tva_rate: isExempt ? 0 : adaptTVAForTerritoire(p.default_tva_rate, territoire), category: p.category, activity_type: cat?.activity_type ?? 'service', pcg_account: cat?.pcg_account ?? null })
  }

  const totals = useMemo(() => {
    let subtotalHT = 0, totalTVA = 0
    items.forEach((it) => { const ht = calculateItemTotalHT(it.quantity, it.unit_price_ht); subtotalHT += ht; totalTVA += calculateItemTVA(ht, it.tva_rate) })
    return { subtotalHT, totalTVA, totalTTC: subtotalHT + totalTVA }
  }, [items])

  const handleSave = async () => {
    if (!business || !clientId) { toast('Sélectionnez un client.', 'error'); return }
    setSaving(true)
    const prefix = business.quote_prefix
    const num = business.next_quote_number
    const year = new Date(issueDate).getFullYear()
    const quoteNumber = `${prefix}-${year}-${String(num).padStart(4, '0')}`

    const { data: quote, error } = await supabase.from('quotes').insert({
      business_id: business.id, client_id: clientId, quote_number: quoteNumber, status: 'draft',
      issue_date: issueDate, validity_days: validityDays, subtotal_ht: totals.subtotalHT, total_tva: totals.totalTVA, total_ttc: totals.totalTTC, notes: notes || null,
    }).select().single()

    if (error || !quote) { toast(error?.message ?? 'Erreur', 'error'); setSaving(false); return }

    await supabase.from('quote_items').insert(items.map((it, i) => ({
      quote_id: quote.id, product_id: it.product_id, description: it.description, quantity: it.quantity, unit: it.unit,
      unit_price_ht: it.unit_price_ht, tva_rate: it.tva_rate, category: it.category, activity_type: it.activity_type, pcg_account: it.pcg_account, octroi_de_mer: it.octroi_de_mer, octroi_de_mer_regional: it.octroi_de_mer_regional, sort_order: i,
    })))

    await supabase.from('businesses').update({ next_quote_number: num + 1 }).eq('id', business.id)
    toast(`Devis ${quoteNumber} créé !`, 'success')
    setSaving(false)
    navigate(`/app/quotes/${quote.id}`)
  }

  const availableCategories = isExempt ? PRODUCT_CATEGORIES.filter((c) => c.id === 'exempt_293b') : PRODUCT_CATEGORIES.filter((c) => c.id !== 'exempt_293b')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/app/quotes')} className="text-surface-600 hover:text-surface-900"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold text-surface-900">Nouveau devis</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm outline-none">
                <option value="">Sélectionner...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Validité (jours)</label>
                <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
            </div>
          </div>
          <AIDescriptionInput
            products={products}
            onGenerate={(aiItems) => setItems((prev) => [...prev.filter((it) => it.description !== ''), ...aiItems])}
          />
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <h3 className="font-semibold text-surface-900">Lignes</h3>
            {items.map((item, index) => (
              <div key={index} className="border border-surface-200 rounded-lg p-4 space-y-3">
                {products.length > 0 && (
                  <select value={item.product_id ?? ''} onChange={(e) => e.target.value && selectProduct(index, e.target.value)} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none">
                    <option value="">— Saisie libre —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <input type="text" value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" placeholder="Description *" />
                <div className="grid grid-cols-5 gap-2">
                  <input type="number" step="0.001" min="0" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  <select value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value as ItemUnit })} className="rounded border border-surface-200 px-2 py-1.5 text-sm outline-none">
                    {ITEM_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <input type="number" step="0.01" min="0" value={item.unit_price_ht} onChange={(e) => updateItem(index, { unit_price_ht: Number(e.target.value) })} className="rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  <select value={item.category} onChange={(e) => { const c = getCategoryById(e.target.value); if (c) updateItem(index, { category: c.id, tva_rate: isExempt ? 0 : adaptTVAForTerritoire(c.tva_rate, territoire), activity_type: c.activity_type, pcg_account: c.pcg_account }) }} className="rounded border border-surface-200 px-2 py-1.5 text-sm outline-none">
                    {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.tva_rate}%</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold flex-1">{formatCurrency(calculateItemTotalHT(item.quantity, item.unit_price_ht))}</span>
                    {items.length > 1 && <button onClick={() => removeItem(index)} className="p-1 text-error-500"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addItem} className="text-sm text-primary-600 font-medium"><Plus className="h-4 w-4 inline mr-1" />Ajouter</button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 sticky top-6 h-fit space-y-4">
          <h3 className="font-semibold text-surface-900">Récapitulatif</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-600">HT</span><span className="font-medium">{formatCurrency(totals.subtotalHT)}</span></div>
            <div className="flex justify-between"><span className="text-surface-600">TVA</span><span className="font-medium">{formatCurrency(totals.totalTVA)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">TTC</span><span className="font-bold">{formatCurrency(totals.totalTTC)}</span></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            <Save className="h-4 w-4 inline mr-2" />{saving ? 'Création...' : 'Créer le devis'}
          </button>
        </div>
      </div>
    </div>
  )
}
