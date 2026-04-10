import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { LEGAL_FORM_LABELS } from '@/lib/types'
import type { PaymentMethod } from '@/lib/types'
import { PAYMENT_METHODS } from '@/lib/types'
import { Building2, CreditCard, FileText, Shield, Save } from 'lucide-react'

export function SettingsPage() {
  const { business, setBusiness } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: business?.business_name ?? '',
    legal_form: business?.legal_form ?? 'auto_entrepreneur',
    siret: business?.siret ?? '',
    vat_number: business?.vat_number ?? '',
    address_line1: business?.address_line1 ?? '',
    postal_code: business?.postal_code ?? '',
    city: business?.city ?? '',
    phone: business?.phone ?? '',
    email: business?.email ?? '',
    website: business?.website ?? '',
    iban: business?.iban ?? '',
    bic: business?.bic ?? '',
    invoice_prefix: business?.invoice_prefix ?? 'FA',
    quote_prefix: business?.quote_prefix ?? 'DE',
    payment_terms_days: business?.payment_terms_days ?? 30,
    default_payment_method: (business?.default_payment_method ?? 'virement') as PaymentMethod,
  })

  const update = (field: string, value: string | number) => setForm((p) => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!business) return
    setSaving(true)
    const isExempt = form.legal_form === 'auto_entrepreneur'
    const { data, error } = await supabase
      .from('businesses')
      .update({
        ...form,
        is_vat_exempt: isExempt,
        siret: form.siret || null,
        vat_number: form.vat_number || null,
        address_line1: form.address_line1 || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        iban: form.iban || null,
        bic: form.bic || null,
      })
      .eq('id', business.id)
      .select()
      .single()

    setSaving(false)
    if (error) {
      toast(error.message, 'error')
    } else if (data) {
      setBusiness(data)
      toast('Paramètres enregistrés', 'success')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-surface-900">Paramètres</h1>

      {/* Business info */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Informations entreprise</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Raison sociale</label>
            <input type="text" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Forme juridique</label>
            <select value={form.legal_form} onChange={(e) => update('legal_form', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none">
              {Object.entries(LEGAL_FORM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">SIRET</label>
            <input type="text" value={form.siret} onChange={(e) => update('siret', e.target.value.replace(/\D/g, '').slice(0, 14))} maxLength={14} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">N° TVA</label>
            <input type="text" value={form.vat_number} onChange={(e) => update('vat_number', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" placeholder="FR12345678901" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Adresse</label>
            <input type="text" value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Code postal</label>
            <input type="text" value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} maxLength={5} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Ville</label>
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Bank */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Coordonnées bancaires</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">IBAN</label>
            <input type="text" value={form.iban} onChange={(e) => update('iban', e.target.value.toUpperCase())} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">BIC</label>
            <input type="text" value={form.bic} onChange={(e) => update('bic', e.target.value.toUpperCase())} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm font-mono outline-none" />
          </div>
        </div>
      </div>

      {/* Invoice settings */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Facturation</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Préfixe factures</label>
            <input type="text" value={form.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Préfixe devis</label>
            <input type="text" value={form.quote_prefix} onChange={(e) => update('quote_prefix', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Délai de paiement (jours)</label>
            <input type="number" min="0" value={form.payment_terms_days} onChange={(e) => update('payment_terms_days', Number(e.target.value))} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Paiement par défaut</label>
            <select value={form.default_payment_method} onChange={(e) => update('default_payment_method', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none">
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* E-invoicing */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Facturation électronique</h2>
        </div>
        <p className="text-sm text-surface-600">
          Vos factures sont générées au format Factur-X (profil MINIMUM), conforme à la norme EN16931.
          La connexion au Portail Public de Facturation (PPF) sera disponible prochainement.
        </p>
        <div className="bg-primary-50 rounded-lg px-4 py-3 text-sm text-primary-700">
          Factur-X est actif sur toutes les factures finalisées.
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
