import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { LEGAL_FORM_LABELS } from '@/lib/types'
import type { LegalForm } from '@/lib/types'
import { Zap, Building2, MapPin, CreditCard } from 'lucide-react'

export function OnboardingPage() {
  const { user, setBusiness, business } = useAuthStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    business_name: '',
    legal_form: 'auto_entrepreneur' as LegalForm,
    siret: '',
    address_line1: '',
    postal_code: '',
    city: '',
    phone: '',
    email: user?.email ?? '',
    iban: '',
    bic: '',
  })

  // If already has business, redirect
  if (business) {
    navigate('/app', { replace: true })
    return null
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isVatExempt = form.legal_form === 'auto_entrepreneur'

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: form.business_name,
        legal_form: form.legal_form,
        siret: form.siret || null,
        is_vat_exempt: isVatExempt,
        address_line1: form.address_line1 || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        iban: form.iban || null,
        bic: form.bic || null,
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      toast(error.message, 'error')
    } else if (data) {
      setBusiness(data)
      toast('Entreprise créée avec succès !', 'success')
      navigate('/app')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-50 px-4 py-8">
      <div className="w-full max-w-lg animate-slideUp">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-surface-900">
              Factur<span className="text-primary-600">IA</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Configurez votre entreprise</h1>
          <p className="text-surface-600 mt-1">Étape {step} sur 3</p>
          <div className="flex gap-2 mt-4 justify-center">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full ${
                  s <= step ? 'bg-primary-600' : 'bg-surface-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Informations générales</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => updateField('business_name', e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="Mon Entreprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Forme juridique
                </label>
                <select
                  value={form.legal_form}
                  onChange={(e) => updateField('legal_form', e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                >
                  {Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {isVatExempt && (
                  <p className="mt-1.5 text-xs text-primary-600">
                    En tant qu'auto-entrepreneur, vous bénéficiez de la franchise de TVA (art. 293 B CGI).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  SIRET (14 chiffres)
                </label>
                <input
                  type="text"
                  value={form.siret}
                  onChange={(e) => updateField('siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="123 456 789 00012"
                  maxLength={14}
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.business_name}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Coordonnées</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={form.address_line1}
                  onChange={(e) => updateField('address_line1', e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="123 rue de la Facturation"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Code postal</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => updateField('postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    placeholder="75001"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    placeholder="Paris"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Email professionnel</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="contact@monentreprise.fr"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Coordonnées bancaires</h2>
              </div>
              <p className="text-sm text-surface-600">
                Optionnel — pour afficher vos coordonnées bancaires sur les factures.
              </p>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">IBAN</label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => updateField('iban', e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">BIC</label>
                <input
                  type="text"
                  value={form.bic}
                  onChange={(e) => updateField('bic', e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="BNPAFRPPXXX"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !form.business_name}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Terminer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
