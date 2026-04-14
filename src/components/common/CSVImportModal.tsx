import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/common/Toast'
import { parseCSV, mapCSVToClients, mapCSVToProducts, downloadTemplate } from '@/lib/csv-import'
import type { CSVImportResult } from '@/lib/csv-import'
import { getCategoryById } from '@/lib/product-categories'
import { Upload, Download, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface CSVImportModalProps {
  type: 'clients' | 'products'
  onClose: () => void
  onImported: () => void
}

type Step = 'upload' | 'preview' | 'done'

export function CSVImportModal({ type, onClose, onImported }: CSVImportModalProps) {
  const { business } = useAuthStore()
  const [step, setStep] = useState<Step>('upload')
  const [result, setResult] = useState<CSVImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const label = type === 'clients' ? 'clients' : 'produits'
  const isExempt = business?.is_vat_exempt ?? false
  const territoire = business?.territoire ?? 'metropole'

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    const parsed = parseCSV(text)

    if (parsed.length < 2) {
      toast('Le fichier CSV est vide ou ne contient qu\'une ligne d\'en-tête.', 'error')
      return
    }

    const mapped = type === 'clients'
      ? mapCSVToClients(parsed)
      : mapCSVToProducts(parsed, isExempt, territoire)

    if (mapped.rows.length === 0) {
      toast('Aucune colonne reconnue. Vérifiez les en-têtes du CSV.', 'error')
      return
    }

    setResult(mapped)
    setStep('preview')
  }, [type, isExempt, territoire])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    if (!business || !result) return
    setImporting(true)

    const validRows = result.rows.filter((r) => r.valid)

    if (type === 'clients') {
      const records = validRows.map((r) => ({
        business_id: business.id,
        company_name: r.data.company_name || null,
        first_name: r.data.first_name || null,
        last_name: r.data.last_name || null,
        email: r.data.email || null,
        phone: r.data.phone || null,
        address_line1: r.data.address_line1 || null,
        postal_code: r.data.postal_code || null,
        city: r.data.city || null,
        siret: r.data.siret || null,
      }))

      const { error } = await supabase.from('clients').insert(records)
      if (error) {
        toast(error.message, 'error')
        setImporting(false)
        return
      }
    } else {
      const records = validRows.map((r) => {
        const cat = getCategoryById(r.data.category)
        return {
          business_id: business.id,
          name: r.data.name,
          description: r.data.description || null,
          category: r.data.category,
          unit: r.data.unit || 'unité',
          default_price_ht: r.data.default_price_ht ? Number(r.data.default_price_ht) : null,
          default_tva_rate: isExempt ? 0 : (r.data.default_tva_rate ? Number(r.data.default_tva_rate) : (cat?.tva_rate ?? 20)),
          est_formation: cat?.activity_type === 'formation',
          gestion_stock: cat?.gestion_stock ?? false,
        }
      })

      const { error } = await supabase.from('products').insert(records)
      if (error) {
        toast(error.message, 'error')
        setImporting(false)
        return
      }
    }

    setImportedCount(validRows.length)
    setImporting(false)
    setStep('done')
    onImported()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">
            Importer des {label}
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-primary-300 rounded-xl p-8 text-center bg-primary-50/50 hover:bg-primary-50 transition-colors cursor-pointer"
              >
                <label className="cursor-pointer">
                  <input type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" />
                  <Upload className="h-10 w-10 text-primary-500 mx-auto mb-3" />
                  <p className="font-semibold text-surface-900">Déposer un fichier CSV</p>
                  <p className="text-sm text-surface-500 mt-1">
                    ou cliquer pour sélectionner — séparateur virgule ou point-virgule
                  </p>
                </label>
              </div>
              <button
                onClick={() => downloadTemplate(type)}
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Download className="h-4 w-4" />
                Télécharger le modèle CSV
              </button>
            </div>
          )}

          {step === 'preview' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 rounded-full px-3 py-1">
                  <CheckCircle2 className="h-4 w-4" /> {result.validCount} valide{result.validCount > 1 ? 's' : ''}
                </span>
                {result.errorCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 rounded-full px-3 py-1">
                    <AlertCircle className="h-4 w-4" /> {result.errorCount} erreur{result.errorCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="border border-surface-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      <th className="px-3 py-2 text-left font-medium text-surface-600 w-8">#</th>
                      {result.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-surface-600 whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium text-surface-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className={`border-b border-surface-100 ${row.valid ? '' : 'bg-red-50'}`}>
                        <td className="px-3 py-2 text-surface-400">{i + 1}</td>
                        {result.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-surface-900 whitespace-nowrap max-w-[200px] truncate">
                            {/* Show original cell values */}
                            {Object.values(row.data)[ci] ?? ''}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-red-600">{row.errors[0]}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rows.length > 50 && (
                <p className="text-xs text-surface-500">Affichage des 50 premières lignes sur {result.rows.length}.</p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-surface-900">Import terminé</h4>
              <p className="text-sm text-surface-600 mt-1">
                {importedCount} {label} importé{importedCount > 1 ? 's' : ''} avec succès.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-200">
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setResult(null) }}
                className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
              >
                Retour
              </button>
              <button
                onClick={handleImport}
                disabled={importing || result?.validCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Import en cours...</>
                ) : (
                  <>Importer {result?.validCount} {label}</>
                )}
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
