// ============================================================
// CSV Import — Parsing, mapping et validation pour clients & produits
// ============================================================

import { validateSiret, validateEmail, validatePhone, validatePostalCode } from './validators'
import { PRODUCT_CATEGORIES } from './product-categories'
import { ITEM_UNITS } from './types'
import type { ItemUnit, Territoire } from './types'

// --- CSV Parser (gère les guillemets et les virgules dans les valeurs) ---

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',' || ch === ';') {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }

  return rows
}

// --- Colonnes attendues ---

export const CSV_CLIENT_COLUMNS = [
  'Raison sociale', 'Prénom', 'Nom', 'Email', 'Téléphone',
  'Adresse', 'Code postal', 'Ville', 'SIRET',
] as const

export const CSV_PRODUCT_COLUMNS = [
  'Nom', 'Description', 'Catégorie', 'Unité', 'Prix HT', 'Taux TVA',
] as const

// --- Mapping colonnes FR → champs ---

const CLIENT_FIELD_MAP: Record<string, string> = {
  'raison sociale': 'company_name',
  'société': 'company_name',
  'entreprise': 'company_name',
  'prénom': 'first_name',
  'nom': 'last_name',
  'email': 'email',
  'mail': 'email',
  'téléphone': 'phone',
  'tel': 'phone',
  'adresse': 'address_line1',
  'code postal': 'postal_code',
  'cp': 'postal_code',
  'ville': 'city',
  'siret': 'siret',
}

const PRODUCT_FIELD_MAP: Record<string, string> = {
  'nom': 'name',
  'description': 'description',
  'catégorie': 'category',
  'categorie': 'category',
  'unité': 'unit',
  'unite': 'unit',
  'prix ht': 'default_price_ht',
  'prix': 'default_price_ht',
  'taux tva': 'default_tva_rate',
  'tva': 'default_tva_rate',
}

function mapHeaders(headers: string[], fieldMap: Record<string, string>): Map<number, string> {
  const mapping = new Map<number, string>()
  headers.forEach((h, i) => {
    const key = h.toLowerCase().trim()
    if (fieldMap[key]) mapping.set(i, fieldMap[key])
  })
  return mapping
}

// --- Types résultat ---

export interface CSVRow {
  data: Record<string, string>
  errors: string[]
  valid: boolean
}

export interface CSVImportResult {
  headers: string[]
  rows: CSVRow[]
  validCount: number
  errorCount: number
}

// --- Mapping clients ---

export function mapCSVToClients(parsed: string[][]): CSVImportResult {
  if (parsed.length < 2) return { headers: [], rows: [], validCount: 0, errorCount: 0 }

  const headers = parsed[0]
  const mapping = mapHeaders(headers, CLIENT_FIELD_MAP)

  if (mapping.size === 0) {
    return { headers, rows: [], validCount: 0, errorCount: 0 }
  }

  const rows: CSVRow[] = parsed.slice(1).map((cells) => {
    const data: Record<string, string> = {}
    mapping.forEach((field, colIndex) => {
      if (cells[colIndex]) data[field] = cells[colIndex]
    })

    const errors: string[] = []

    if (!data.company_name && !data.last_name) {
      errors.push('Raison sociale ou Nom requis')
    }
    if (data.siret) {
      const r = validateSiret(data.siret)
      if (!r.valid) errors.push(r.message)
    }
    if (data.email) {
      const r = validateEmail(data.email)
      if (!r.valid) errors.push(r.message)
    }
    if (data.phone) {
      const r = validatePhone(data.phone)
      if (!r.valid) errors.push(r.message)
    }
    if (data.postal_code) {
      const r = validatePostalCode(data.postal_code)
      if (!r.valid) errors.push(r.message)
    }

    return { data, errors, valid: errors.length === 0 }
  })

  return {
    headers,
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length,
  }
}

// --- Mapping produits ---

function resolveUnit(raw: string): ItemUnit {
  const lower = raw.toLowerCase().trim()
  const match = ITEM_UNITS.find(
    (u) => u.value === lower || u.label.toLowerCase() === lower
  )
  return match?.value ?? 'unité'
}

function resolveCategory(raw: string): string | null {
  const lower = raw.toLowerCase().trim()
  const match = PRODUCT_CATEGORIES.find(
    (c) => c.id === lower || c.label.toLowerCase() === lower || c.label.toLowerCase().includes(lower)
  )
  return match?.id ?? null
}

export function mapCSVToProducts(
  parsed: string[][],
  isExempt: boolean,
  _territoire: Territoire
): CSVImportResult {
  if (parsed.length < 2) return { headers: [], rows: [], validCount: 0, errorCount: 0 }

  const headers = parsed[0]
  const mapping = mapHeaders(headers, PRODUCT_FIELD_MAP)

  if (mapping.size === 0) {
    return { headers, rows: [], validCount: 0, errorCount: 0 }
  }

  const rows: CSVRow[] = parsed.slice(1).map((cells) => {
    const data: Record<string, string> = {}
    mapping.forEach((field, colIndex) => {
      if (cells[colIndex]) data[field] = cells[colIndex]
    })

    const errors: string[] = []

    if (!data.name) {
      errors.push('Nom requis')
    }

    // Resolve category
    if (data.category) {
      const catId = resolveCategory(data.category)
      if (catId) {
        data.category = catId
      } else {
        errors.push(`Catégorie inconnue : "${data.category}"`)
      }
    } else {
      data.category = isExempt ? 'exempt_293b' : 'prestation_generale'
    }

    // Resolve unit
    if (data.unit) {
      data.unit = resolveUnit(data.unit)
    } else {
      data.unit = 'unité'
    }

    // Validate price
    if (data.default_price_ht) {
      const price = parseFloat(data.default_price_ht.replace(',', '.'))
      if (isNaN(price) || price < 0) {
        errors.push('Prix HT invalide')
      } else {
        data.default_price_ht = String(price)
      }
    }

    // Validate TVA
    if (data.default_tva_rate) {
      const rate = parseFloat(data.default_tva_rate.replace(',', '.'))
      if (isNaN(rate) || rate < 0) {
        errors.push('Taux TVA invalide')
      } else {
        data.default_tva_rate = String(rate)
      }
    }

    return { data, errors, valid: errors.length === 0 }
  })

  return {
    headers,
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length,
  }
}

// --- Templates CSV téléchargeables ---

export function generateCSVTemplate(type: 'clients' | 'products'): string {
  if (type === 'clients') {
    return [
      CSV_CLIENT_COLUMNS.join(','),
      'Entreprise SAS,Jean,Dupont,jean@exemple.fr,0612345678,1 rue de la Paix,75001,Paris,35600000000048',
    ].join('\n')
  }
  return [
    CSV_PRODUCT_COLUMNS.join(','),
    'Création site web,Site vitrine 5 pages,Prestation de service,forfait,1500,20',
    'Formation WordPress,Formation 2h,Formation professionnelle,session,200,0',
  ].join('\n')
}

export function downloadTemplate(type: 'clients' | 'products') {
  const content = generateCSVTemplate(type)
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modele_${type}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
