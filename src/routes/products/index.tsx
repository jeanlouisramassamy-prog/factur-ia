import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES, getCategoryById } from '@/lib/product-categories'
import type { Product, ItemUnit } from '@/lib/types'
import { ITEM_UNITS } from '@/lib/types'
import { Package, Plus, Tag, X } from 'lucide-react'

export function ProductsPage() {
  const { business } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const isExempt = business?.is_vat_exempt ?? false

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: isExempt ? 'exempt_293b' : 'services_general',
    unit: 'unité' as ItemUnit,
    default_price_ht: '',
  })

  useEffect(() => {
    if (business) loadProducts()
  }, [business])

  const loadProducts = async () => {
    if (!business) return
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .order('name')
    if (data) setProducts(data)
    setLoading(false)
  }

  const selectedCategory = getCategoryById(form.category)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business || !selectedCategory) return
    setSaving(true)

    const { error } = await supabase.from('products').insert({
      business_id: business.id,
      name: form.name,
      description: form.description || null,
      category: form.category,
      unit: form.unit,
      default_price_ht: form.default_price_ht ? Number(form.default_price_ht) : null,
      default_tva_rate: isExempt ? 0 : selectedCategory.tva_rate,
    })

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Produit créé', 'success')
      setShowForm(false)
      setForm({ name: '', description: '', category: isExempt ? 'exempt_293b' : 'services_general', unit: 'unité', default_price_ht: '' })
      loadProducts()
    }
  }

  const availableCategories = isExempt
    ? PRODUCT_CATEGORIES.filter((c) => c.id === 'exempt_293b')
    : PRODUCT_CATEGORIES.filter((c) => c.id !== 'exempt_293b')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Catalogue produits</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau produit
        </button>
      </div>

      {isExempt && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-sm text-primary-700">
          En tant qu'auto-entrepreneur, la TVA est automatiquement à 0 % (art. 293 B CGI).
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-surface-200 p-5 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900">Nouveau produit / service</h3>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="h-5 w-5 text-surface-400" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              placeholder="Création site web, Consultation 1h..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              rows={2}
              placeholder="Description optionnelle..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Catégorie fiscale *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.tva_rate} %)
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className="mt-1 text-xs text-surface-500">
                  {selectedCategory.description} — PCG {selectedCategory.pcg_account || 'N/A'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Unité</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as ItemUnit })}
                className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              >
                {ITEM_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Prix HT par défaut</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.default_price_ht}
              onChange={(e) => setForm({ ...form, default_price_ht: e.target.value })}
              className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
              Annuler
            </button>
            <button type="submit" disabled={saving || !form.name} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">Aucun produit. Créez votre premier produit/service.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {products.map((p) => {
              const cat = getCategoryById(p.category)
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{p.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-surface-500">
                        <Tag className="h-3 w-3" /> {cat?.label ?? p.category}
                      </span>
                      <span className="text-xs text-surface-500">
                        TVA {p.default_tva_rate} %
                      </span>
                      {cat?.pcg_account && (
                        <span className="text-xs text-surface-400 font-mono">
                          PCG {cat.pcg_account}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {p.default_price_ht != null && (
                      <p className="text-sm font-semibold text-surface-900">
                        {formatCurrency(p.default_price_ht)} HT
                      </p>
                    )}
                    <p className="text-xs text-surface-500">/ {p.unit}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
