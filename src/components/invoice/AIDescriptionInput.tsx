import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { PRODUCT_CATEGORIES } from '@/lib/product-categories'
import { toast } from '@/components/common/Toast'
import type { InvoiceItemDraft, Product } from '@/lib/types'
import { Sparkles, Loader2 } from 'lucide-react'

interface AIDescriptionInputProps {
  products: Product[]
  onGenerate: (items: InvoiceItemDraft[]) => void
}

export function AIDescriptionInput({ products, onGenerate }: AIDescriptionInputProps) {
  const { business } = useAuthStore()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!description.trim() || !business) return
    setLoading(true)

    try {
      const isExempt = business.is_vat_exempt
      const territoire = business.territoire ?? 'metropole'

      const categories = PRODUCT_CATEGORIES
        .filter((c) => isExempt ? c.id === 'exempt_293b' : c.id !== 'exempt_293b')
        .map((c) => ({
          id: c.id,
          label: c.label,
          tva_rate: c.tva_rate,
          activity_type: c.activity_type,
        }))

      const productCatalog = products.map((p) => ({
        name: p.name,
        category: p.category,
        default_price_ht: p.default_price_ht,
        unit: p.unit,
        tva_rate: p.default_tva_rate,
      }))

      const { data, error } = await supabase.functions.invoke('generate-invoice-lines', {
        body: {
          description: description.trim(),
          products: productCatalog,
          categories,
          is_vat_exempt: isExempt,
          territoire,
        },
      })

      if (error) {
        toast(error.message || 'Erreur lors de la génération IA', 'error')
        setLoading(false)
        return
      }

      const lines = data?.lines
      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        toast('L\'IA n\'a pas pu générer de lignes. Reformulez votre description.', 'warning')
        setLoading(false)
        return
      }

      const validUnits: InvoiceItemDraft['unit'][] = ['unité', 'heure', 'jour', 'forfait', 'm²', 'kg', 'lot', 'session', 'pièce']
      const validActivityTypes: InvoiceItemDraft['activity_type'][] = ['service', 'goods', 'produit_fini', 'formation', 'export', 'exempt']

      // Validate and convert to InvoiceItemDraft format
      const items: InvoiceItemDraft[] = lines
        .filter((line: unknown): line is Record<string, unknown> =>
          typeof line === 'object' && line !== null && typeof (line as Record<string, unknown>).description === 'string'
        )
        .map((line) => {
          const cat = PRODUCT_CATEGORIES.find((c) => c.id === String(line.category))
          const unit = validUnits.includes(String(line.unit) as InvoiceItemDraft['unit'])
            ? (String(line.unit) as InvoiceItemDraft['unit'])
            : 'unité'
          const activityType = validActivityTypes.includes(String(line.activity_type) as InvoiceItemDraft['activity_type'])
            ? (String(line.activity_type) as InvoiceItemDraft['activity_type'])
            : 'service'
          return {
            product_id: null,
            description: String(line.description).slice(0, 500),
            quantity: Math.max(0.01, Number(line.quantity) || 1),
            unit,
            unit_price_ht: Math.max(0, Math.round((Number(line.unit_price_ht) || 0) * 100) / 100),
            tva_rate: isExempt ? 0 : Math.max(0, Number(line.tva_rate) ?? 20),
            category: cat?.id ?? (isExempt ? 'exempt_293b' : 'prestation_generale'),
            activity_type: activityType,
            pcg_account: cat?.pcg_account ?? null,
            octroi_de_mer: 0,
            octroi_de_mer_regional: 0,
          }
        })

      if (items.length === 0) {
        toast('L\'IA n\'a pas pu générer de lignes valides. Reformulez votre description.', 'warning')
        setLoading(false)
        return
      }

      onGenerate(items)
      setDescription('')
      toast(`${items.length} ligne(s) générée(s) par l'IA`, 'success')
    } catch {
      toast('Erreur de connexion à l\'IA', 'error')
    }

    setLoading(false)
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary-600" />
        <h3 className="font-semibold text-surface-900">Génération IA</h3>
        <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">Beta</span>
      </div>
      <p className="text-sm text-surface-600 mb-3">
        Décrivez votre prestation en langage naturel et l'IA génère les lignes de facture.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
          disabled={loading}
          className="flex-1 rounded-lg border border-primary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white disabled:opacity-50"
          placeholder='Ex: "Refonte site web 5 pages + hébergement 1 an + formation WordPress 2h"'
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Génération...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Générer</>
          )}
        </button>
      </div>
    </div>
  )
}
