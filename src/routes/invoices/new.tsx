import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import {
  formatCurrency,
  todayISO,
  addDays,
  calculateItemTotalHT,
  calculateItemTVA,
  getClientDisplayName,
} from '@/lib/utils'
import { PRODUCT_CATEGORIES, getCategoryById } from '@/lib/product-categories'
import { LEGAL_MENTIONS, adaptTVAForTerritoire } from '@/lib/french-tax'
import { generateFacturXMinimumXML } from '@/lib/facturx-xml'
import { ITEM_UNITS, PAYMENT_METHODS } from '@/lib/types'
import type { Client, Product, InvoiceItemDraft, ItemUnit, PaymentMethod } from '@/lib/types'
import { AIDescriptionInput } from '@/components/invoice/AIDescriptionInput'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'

function emptyItem(isExempt: boolean, territoire: string = 'metropole'): InvoiceItemDraft {
  const cat = isExempt ? 'exempt_293b' : 'prestation_generale'
  const category = getCategoryById(cat)!
  const tva = isExempt ? 0 : adaptTVAForTerritoire(category.tva_rate, territoire as 'metropole' | 'dom')
  return {
    product_id: null,
    description: '',
    quantity: 1,
    unit: 'unité',
    unit_price_ht: 0,
    tva_rate: tva,
    category: cat,
    activity_type: category.activity_type,
    pcg_account: category.pcg_account,
    octroi_de_mer: 0,
    octroi_de_mer_regional: 0,
  }
}

export function InvoiceNewPage() {
  const { business } = useAuthStore()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)

  const isExempt = business?.is_vat_exempt ?? false
  const territoire = business?.territoire ?? 'metropole'

  const [clientId, setClientId] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(addDays(todayISO(), business?.payment_terms_days ?? 30))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(business?.default_payment_method ?? 'virement')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItemDraft[]>([emptyItem(isExempt, territoire)])

  useEffect(() => {
    if (business) {
      loadClients()
      loadProducts()
    }
  }, [business])

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').eq('business_id', business!.id).order('company_name')
    if (data) setClients(data)
  }

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('business_id', business!.id).eq('is_active', true).order('name')
    if (data) setProducts(data)
  }

  const updateItem = (index: number, updates: Partial<InvoiceItemDraft>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)))
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem(isExempt, territoire)])
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const cat = getCategoryById(product.category)
    const tvaRate = isExempt ? 0 : adaptTVAForTerritoire(product.default_tva_rate, territoire)
    updateItem(index, {
      product_id: product.id,
      description: product.name + (product.description ? ` — ${product.description}` : ''),
      unit_price_ht: product.default_price_ht ?? 0,
      unit: product.unit,
      tva_rate: tvaRate,
      category: product.category,
      activity_type: cat?.activity_type ?? 'service',
      pcg_account: cat?.pcg_account ?? null,
    })
  }

  const totals = useMemo(() => {
    let subtotalHT = 0
    let totalTVA = 0
    items.forEach((item) => {
      const ht = calculateItemTotalHT(item.quantity, item.unit_price_ht)
      subtotalHT += ht
      totalTVA += calculateItemTVA(ht, item.tva_rate)
    })
    return { subtotalHT, totalTVA, totalTTC: subtotalHT + totalTVA }
  }, [items])

  const handleSave = async (asDraft: boolean) => {
    if (!business || !clientId) {
      toast('Veuillez sélectionner un client.', 'error')
      return
    }
    if (items.some((it) => !it.description || it.unit_price_ht <= 0)) {
      toast('Chaque ligne doit avoir une description et un prix.', 'error')
      return
    }

    setSaving(true)

    // Generate number
    const prefix = business.invoice_prefix
    const num = business.next_invoice_number
    const year = new Date(issueDate).getFullYear()
    const invoiceNumber = `${prefix}-${year}-${String(num).padStart(4, '0')}`

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        business_id: business.id,
        client_id: clientId,
        invoice_number: invoiceNumber,
        status: asDraft ? 'draft' : 'sent',
        issue_date: issueDate,
        due_date: dueDate,
        subtotal_ht: totals.subtotalHT,
        total_tva: totals.totalTVA,
        total_ttc: totals.totalTTC,
        notes: notes || null,
        payment_method: paymentMethod,
      })
      .select()
      .single()

    if (error || !invoice) {
      toast(error?.message ?? 'Erreur lors de la création', 'error')
      setSaving(false)
      return
    }

    // Insert items
    const itemsToInsert = items.map((item, i) => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price_ht: item.unit_price_ht,
      tva_rate: item.tva_rate,
      category: item.category,
      activity_type: item.activity_type,
      pcg_account: item.pcg_account,
      octroi_de_mer: item.octroi_de_mer,
      octroi_de_mer_regional: item.octroi_de_mer_regional,
      sort_order: i,
    }))

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert)
    if (itemsError) {
      toast(itemsError.message, 'error')
      setSaving(false)
      return
    }

    // Generate Factur-X XML if not draft
    if (!asDraft) {
      const selectedClient = clients.find((c) => c.id === clientId)
      if (selectedClient) {
        const xml = generateFacturXMinimumXML({
          invoice: { ...invoice, subtotal_ht: totals.subtotalHT, total_tva: totals.totalTVA, total_ttc: totals.totalTTC },
          items: itemsToInsert.map((it, i) => ({ ...it, id: `tmp-${i}`, invoice_id: invoice.id, total_ht: it.quantity * it.unit_price_ht, total_ttc: it.quantity * it.unit_price_ht * (1 + it.tva_rate / 100), created_at: '' })),
          business,
          client: selectedClient,
        })
        await supabase.from('invoices').update({ facturx_xml: xml, einvoice_status: 'generated' }).eq('id', invoice.id)
      }
    }

    // Update next number
    await supabase
      .from('businesses')
      .update({ next_invoice_number: num + 1 })
      .eq('id', business.id)

    toast(`Facture ${invoiceNumber} créée !`, 'success')
    setSaving(false)
    navigate(`/app/invoices/${invoice.id}`)
  }

  const availableCategories = isExempt
    ? PRODUCT_CATEGORIES.filter((c) => c.id === 'exempt_293b')
    : PRODUCT_CATEGORIES.filter((c) => c.id !== 'exempt_293b')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/app/invoices')} className="text-surface-600 hover:text-surface-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-surface-900">Nouvelle facture</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Client + dates */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 outline-none"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Date d'émission</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Date d'échéance</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Paiement</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* AI Generation */}
          <AIDescriptionInput
            products={products}
            onGenerate={(aiItems) => setItems((prev) => [...prev.filter((it) => it.description !== ''), ...aiItems])}
          />

          {/* Line items */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
            <h3 className="font-semibold text-surface-900">Lignes de facture</h3>
            {items.map((item, index) => (
              <div key={index} className="border border-surface-200 rounded-lg p-4 space-y-3">
                {products.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Produit du catalogue</label>
                    <select
                      value={item.product_id ?? ''}
                      onChange={(e) => e.target.value && selectProduct(index, e.target.value)}
                      className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none"
                    >
                      <option value="">— Saisie libre —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.default_price_ht ?? 0)})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Description *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none"
                    placeholder="Description du produit ou service"
                  />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Qté</label>
                    <input type="number" step="0.001" min="0" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Unité</label>
                    <select value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value as ItemUnit })} className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm outline-none">
                      {ITEM_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Prix HT</label>
                    <input type="number" step="0.01" min="0" value={item.unit_price_ht} onChange={(e) => updateItem(index, { unit_price_ht: Number(e.target.value) })} className="w-full rounded border border-surface-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">TVA</label>
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const cat = getCategoryById(e.target.value)
                        if (cat) updateItem(index, { category: cat.id, tva_rate: isExempt ? 0 : adaptTVAForTerritoire(cat.tva_rate, territoire), activity_type: cat.activity_type, pcg_account: cat.pcg_account })
                      }}
                      className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm outline-none"
                    >
                      {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.tva_rate} %</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-surface-500 mb-1">Total HT</label>
                      <p className="text-sm font-semibold py-1.5">{formatCurrency(calculateItemTotalHT(item.quantity, item.unit_price_ht))}</p>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)} className="p-1.5 text-error-500 hover:bg-error-50 rounded mb-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addItem} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Plus className="h-4 w-4" /> Ajouter une ligne
            </button>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes / Conditions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none"
              rows={3}
              placeholder="Conditions particulières..."
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-surface-200 p-5 sticky top-6">
            <h3 className="font-semibold text-surface-900 mb-4">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-600">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(totals.subtotalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">TVA</span>
                <span className="font-medium">{formatCurrency(totals.totalTVA)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-200 pt-2 text-base">
                <span className="font-semibold text-surface-900">Total TTC</span>
                <span className="font-bold text-surface-900">{formatCurrency(totals.totalTTC)}</span>
              </div>
            </div>

            {isExempt && (
              <p className="mt-4 text-xs text-primary-600 italic">
                {LEGAL_MENTIONS.vat_exempt}
              </p>
            )}

            {items.some((it) => it.activity_type === 'formation' && it.tva_rate === 0) && (
              <p className="mt-2 text-xs text-amber-600 italic">
                {LEGAL_MENTIONS.formation_exempt}
              </p>
            )}

            {territoire === 'dom' && (
              <p className="mt-2 text-xs text-amber-600">
                Taux TVA DOM appliqués.
              </p>
            )}

            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Enregistrer brouillon
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Créer et envoyer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
