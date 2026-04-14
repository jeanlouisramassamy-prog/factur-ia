import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { getClientDisplayName } from '@/lib/utils'
import { toast } from '@/components/common/Toast'
import { Users, Plus, Search, Mail, Phone, ChevronRight, Upload } from 'lucide-react'
import { validateSiret, validateEmail, validatePhone, validatePostalCode, validateFields, hasErrors } from '@/lib/validators'
import type { FieldErrors } from '@/lib/validators'
import { useClients } from '@/hooks/useData'
import { CSVImportModal } from '@/components/common/CSVImportModal'

export function ClientsListPage() {
  const { business } = useAuthStore()
  const { clients, loading, refetch } = useClients(business?.id)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    postal_code: '',
    city: '',
    siret: '',
  })

  const [errors, setErrors] = useState<FieldErrors>({})

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return

    const fieldErrors = validateFields([
      { field: 'siret', result: validateSiret(form.siret) },
      { field: 'email', result: validateEmail(form.email) },
      { field: 'phone', result: validatePhone(form.phone) },
      { field: 'postal_code', result: validatePostalCode(form.postal_code) },
    ])
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors)
      toast('Veuillez corriger les erreurs de saisie.', 'error')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      business_id: business.id,
      company_name: form.company_name || null,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address_line1: form.address_line1 || null,
      postal_code: form.postal_code || null,
      city: form.city || null,
      siret: form.siret || null,
    })
    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Client créé', 'success')
      setShowForm(false)
      setForm({ company_name: '', first_name: '', last_name: '', email: '', phone: '', address_line1: '', postal_code: '', city: '', siret: '' })
      refetch()
    }
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Clients</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-surface-200 p-5 space-y-4 animate-slideDown">
          <h3 className="font-semibold text-surface-900">Nouveau client</h3>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Raison sociale</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              placeholder="Entreprise SAS (laisser vide si particulier)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Prénom</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Nom</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n }) }} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Téléphone</label>
              <input type="tel" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n }) }} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
              Annuler
            </button>
            <button type="submit" disabled={saving || (!form.company_name && !form.last_name)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
          placeholder="Rechercher un client..."
        />
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">
              {search ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((client) => (
              <Link
                key={client.id}
                to={`/app/clients/${client.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-surface-900">
                    {getClientDisplayName(client)}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    {client.email && (
                      <span className="flex items-center gap-1 text-xs text-surface-500">
                        <Mail className="h-3 w-3" /> {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="flex items-center gap-1 text-xs text-surface-500">
                        <Phone className="h-3 w-3" /> {client.phone}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-surface-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {showImport && (
        <CSVImportModal
          type="clients"
          onClose={() => setShowImport(false)}
          onImported={refetch}
        />
      )}
    </div>
  )
}
