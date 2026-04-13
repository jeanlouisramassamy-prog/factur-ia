import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import type { Supplier } from '@/lib/types'
import { Truck, Plus, Search, Mail, Phone, X, Building2 } from 'lucide-react'

export function SuppliersPage() {
  const { business } = useAuthStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', siret: '', email: '', phone: '', address_line1: '', postal_code: '', city: '' })

  useEffect(() => { if (business) loadSuppliers() }, [business])

  const loadSuppliers = async () => {
    if (!business) return
    const { data } = await supabase.from('suppliers').select('*').eq('business_id', business.id).order('name')
    if (data) setSuppliers(data)
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    const { error } = await supabase.from('suppliers').insert({
      business_id: business.id,
      name: form.name,
      siret: form.siret || null,
      email: form.email || null,
      phone: form.phone || null,
      address_line1: form.address_line1 || null,
      postal_code: form.postal_code || null,
      city: form.city || null,
    })
    setSaving(false)
    if (error) { toast(error.message, 'error') }
    else {
      toast('Fournisseur créé', 'success')
      setShowForm(false)
      setForm({ name: '', siret: '', email: '', phone: '', address_line1: '', postal_code: '', city: '' })
      loadSuppliers()
    }
  }

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.siret?.includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Fournisseurs</h1>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Nouveau fournisseur
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-surface-200 p-5 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900">Nouveau fournisseur</h3>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-surface-400" /></button>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Nom / Raison sociale *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 outline-none" placeholder="Entreprise SARL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">SIRET</label>
              <input type="text" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value.replace(/\D/g, '').slice(0, 14) })} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" maxLength={14} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">Annuler</button>
            <button type="submit" disabled={saving || !form.name} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 outline-none bg-white" placeholder="Rechercher un fournisseur..." />
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">{search ? 'Aucun fournisseur trouvé.' : 'Aucun fournisseur.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-surface-900">{s.name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    {s.siret && <span className="flex items-center gap-1 text-xs text-surface-500"><Building2 className="h-3 w-3" /> {s.siret}</span>}
                    {s.email && <span className="flex items-center gap-1 text-xs text-surface-500"><Mail className="h-3 w-3" /> {s.email}</span>}
                    {s.phone && <span className="flex items-center gap-1 text-xs text-surface-500"><Phone className="h-3 w-3" /> {s.phone}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
