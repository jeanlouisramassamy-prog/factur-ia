import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { LEGAL_FORM_LABELS } from '@/lib/types'
import type { PaymentMethod, Territoire } from '@/lib/types'
import { PAYMENT_METHODS } from '@/lib/types'
import { Building2, CreditCard, FileText, Shield, Save, Globe, GraduationCap, Upload, Trash2, ImageIcon } from 'lucide-react'
import { validateSiret, validateVatNumber, validateEmail, validatePhone, validatePostalCode, validateIban, validateBic, validateFields, hasErrors } from '@/lib/validators'
import type { FieldErrors } from '@/lib/validators'

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
    territoire: (business?.territoire ?? 'metropole') as Territoire,
    assujetti_octroi_de_mer: business?.assujetti_octroi_de_mer ?? false,
    acre_dom_annee: business?.acre_dom_annee ?? null,
    exoneration_tva_formation: business?.exoneration_tva_formation ?? false,
  })

  const [errors, setErrors] = useState<FieldErrors>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !business) return
    if (!file.type.startsWith('image/')) {
      toast('Veuillez sélectionner une image (PNG, JPG, SVG).', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Le logo ne doit pas dépasser 2 Mo.', 'error')
      return
    }

    setUploadingLogo(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${business.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast(uploadError.message, 'error')
      setUploadingLogo(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const logoUrl = urlData.publicUrl + '?t=' + Date.now()

    const { data, error } = await supabase
      .from('businesses')
      .update({ logo_url: logoUrl })
      .eq('id', business.id)
      .select()
      .single()

    setUploadingLogo(false)
    if (error) {
      toast(error.message, 'error')
    } else if (data) {
      setBusiness(data)
      toast('Logo mis à jour', 'success')
    }
  }

  const handleLogoRemove = async () => {
    if (!business) return
    const { data, error } = await supabase
      .from('businesses')
      .update({ logo_url: null })
      .eq('id', business.id)
      .select()
      .single()
    if (error) {
      toast(error.message, 'error')
    } else if (data) {
      setBusiness(data)
      toast('Logo supprimé', 'success')
    }
  }

  const update = (field: string, value: string | number | boolean | null) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  const handleSave = async () => {
    if (!business) return

    const fieldErrors = validateFields([
      { field: 'siret', result: validateSiret(form.siret) },
      { field: 'vat_number', result: validateVatNumber(form.vat_number) },
      { field: 'email', result: validateEmail(form.email) },
      { field: 'phone', result: validatePhone(form.phone) },
      { field: 'postal_code', result: validatePostalCode(form.postal_code) },
      { field: 'iban', result: validateIban(form.iban) },
      { field: 'bic', result: validateBic(form.bic) },
    ])
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors)
      toast('Veuillez corriger les erreurs de saisie.', 'error')
      return
    }

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

      {/* Logo */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Logo</h2>
        </div>
        <p className="text-sm text-surface-600">
          Votre logo apparaîtra sur les factures et devis PDF.
        </p>
        <div className="flex items-center gap-4">
          {business?.logo_url ? (
            <div className="flex items-center gap-4">
              <img src={business.logo_url} alt="Logo" className="h-16 w-auto max-w-[200px] rounded border border-surface-200 object-contain" />
              <button
                onClick={handleLogoRemove}
                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded border-2 border-dashed border-surface-300 flex items-center justify-center text-surface-400">
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-sm text-surface-500">Aucun logo</span>
            </div>
          )}
          <label className={`inline-flex items-center gap-2 rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 cursor-pointer ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="h-4 w-4" />
            {uploadingLogo ? 'Upload...' : 'Changer'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>
      </div>

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
            {errors.siret && <p className="mt-1 text-xs text-red-600">{errors.siret}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">N° TVA</label>
            <input type="text" value={form.vat_number} onChange={(e) => update('vat_number', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" placeholder="FR12345678901" />
            {errors.vat_number && <p className="mt-1 text-xs text-red-600">{errors.vat_number}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Adresse</label>
            <input type="text" value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Code postal</label>
            <input type="text" value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} maxLength={5} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none" />
            {errors.postal_code && <p className="mt-1 text-xs text-red-600">{errors.postal_code}</p>}
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
            {errors.iban && <p className="mt-1 text-xs text-red-600">{errors.iban}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">BIC</label>
            <input type="text" value={form.bic} onChange={(e) => update('bic', e.target.value.toUpperCase())} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm font-mono outline-none" />
            {errors.bic && <p className="mt-1 text-xs text-red-600">{errors.bic}</p>}
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

      {/* Territoire & DOM */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Territoire & DOM</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Territoire</label>
          <select value={form.territoire} onChange={(e) => update('territoire', e.target.value)} className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none">
            <option value="metropole">France métropolitaine</option>
            <option value="dom">DOM (La Réunion, Guadeloupe, Martinique...)</option>
          </select>
        </div>
        {form.territoire === 'dom' && (
          <>
            <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-700">
              TVA DOM : taux normal 8,5 % — taux réduit 2,1 %
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="octroi"
                checked={form.assujetti_octroi_de_mer}
                onChange={(e) => update('assujetti_octroi_de_mer', e.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-primary-600"
              />
              <label htmlFor="octroi" className="text-sm text-surface-700">
                Assujetti à l'Octroi de Mer (CA &ge; 300 000 €)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">ACRE DOM — Année en cours</label>
              <select
                value={form.acre_dom_annee ?? ''}
                onChange={(e) => update('acre_dom_annee', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-surface-300 px-4 py-2 text-sm outline-none"
              >
                <option value="">Non applicable</option>
                <option value="1">Année 1 — Exonération totale</option>
                <option value="2">Année 2 — Exonération 75 %</option>
                <option value="3">Année 3 — Exonération 50 %</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Formations */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Formations</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="formation_exo"
            checked={form.exoneration_tva_formation}
            onChange={(e) => update('exoneration_tva_formation', e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary-600"
          />
          <label htmlFor="formation_exo" className="text-sm text-surface-700">
            Organisme de formation déclaré auprès de la DREETS
          </label>
        </div>
        {form.exoneration_tva_formation && (
          <div className="bg-primary-50 rounded-lg px-4 py-3 text-sm text-primary-700">
            Vos formations seront exonérées de TVA (art. 261-4-4° du CGI).
            La mention sera ajoutée automatiquement sur les factures.
          </div>
        )}
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
