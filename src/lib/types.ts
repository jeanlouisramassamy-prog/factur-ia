// ============================================================
// FacturIA — Types & Interfaces
// ============================================================

import type { User } from '@supabase/supabase-js'

export type { User }

// --- Enums ---

export type LegalForm =
  | 'auto_entrepreneur'
  | 'ei'
  | 'eurl'
  | 'sasu'
  | 'sarl'
  | 'sas'
  | 'sa'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'invoiced'

export type EInvoiceStatus = 'none' | 'generated' | 'sent_ppf' | 'accepted' | 'rejected'

export type FacturXProfile = 'MINIMUM' | 'BASIC' | 'EN16931'

export type ActivityType = 'service' | 'goods' | 'export' | 'exempt'

export type Plan = 'free' | 'solo' | 'pro'

export type PaymentMethod = 'virement' | 'cheque' | 'especes' | 'carte' | 'prelevement' | 'autre'

export type ItemUnit = 'unité' | 'heure' | 'jour' | 'forfait' | 'm²' | 'kg' | 'lot'

// --- Core Models ---

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  business_name: string
  siret: string | null
  siren: string | null
  legal_form: LegalForm
  vat_number: string | null
  is_vat_exempt: boolean
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  iban: string | null
  bic: string | null
  payment_terms_days: number
  default_payment_method: PaymentMethod
  invoice_prefix: string
  quote_prefix: string
  next_invoice_number: number
  next_quote_number: number
  fiscal_year_start: number
  plan: Plan
  plan_expires_at: string | null
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  company_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string
  siret: string | null
  vat_number: string | null
  notes: string | null
  created_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string | null
  category: string
  unit: ItemUnit
  default_price_ht: number | null
  default_tva_rate: number
  is_active: boolean
  created_at: string
}

export interface Invoice {
  id: string
  business_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  subtotal_ht: number
  total_tva: number
  total_ttc: number
  discount_percent: number
  notes: string | null
  payment_method: PaymentMethod | null
  paid_at: string | null
  sent_at: string | null
  reminder_sent_at: string | null
  pdf_url: string | null
  facturx_xml: string | null
  facturx_profile: FacturXProfile
  einvoice_status: EInvoiceStatus
  ppf_id: string | null
  created_at: string
  // Joined
  client?: Client
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id: string | null
  description: string
  quantity: number
  unit: ItemUnit
  unit_price_ht: number
  tva_rate: number
  category: string
  activity_type: ActivityType
  pcg_account: string | null
  total_ht: number
  total_ttc: number
  sort_order: number
  created_at: string
}

export interface Quote {
  id: string
  business_id: string
  client_id: string
  quote_number: string
  status: QuoteStatus
  issue_date: string
  validity_days: number
  subtotal_ht: number
  total_tva: number
  total_ttc: number
  notes: string | null
  converted_invoice_id: string | null
  created_at: string
  // Joined
  client?: Client
  items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id: string | null
  description: string
  quantity: number
  unit: ItemUnit
  unit_price_ht: number
  tva_rate: number
  category: string
  activity_type: ActivityType
  pcg_account: string | null
  total_ht: number
  total_ttc: number
  sort_order: number
  created_at: string
}

// --- Dashboard & Stats ---

export interface RevenueStats {
  month: number
  year: number
  total_ht: number
  services_ht: number
  goods_ht: number
  total_ttc: number
  invoices_count: number
  paid_count: number
  overdue_count: number
}

export interface TVABreakdown {
  tva_rate: number
  base_ht: number
  total_tva: number
}

export interface MicroThresholds {
  services_ht: number
  services_limit: number
  services_percent: number
  goods_ht: number
  goods_limit: number
  goods_percent: number
}

// --- Form helpers ---

export interface InvoiceItemDraft {
  id?: string
  product_id: string | null
  description: string
  quantity: number
  unit: ItemUnit
  unit_price_ht: number
  tva_rate: number
  category: string
  activity_type: ActivityType
  pcg_account: string | null
}

export interface InvoiceDraft {
  client_id: string
  issue_date: string
  due_date: string
  notes: string
  payment_method: PaymentMethod
  discount_percent: number
  items: InvoiceItemDraft[]
}

export interface QuoteItemDraft {
  id?: string
  product_id: string | null
  description: string
  quantity: number
  unit: ItemUnit
  unit_price_ht: number
  tva_rate: number
  category: string
  activity_type: ActivityType
  pcg_account: string | null
}

export interface QuoteDraft {
  client_id: string
  issue_date: string
  validity_days: number
  notes: string
  items: QuoteItemDraft[]
}

// --- Status display ---

export const INVOICE_STATUS_INFO: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'En retard', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-500' },
}

export const QUOTE_STATUS_INFO: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700' },
  invoiced: { label: 'Facturé', color: 'bg-purple-100 text-purple-700' },
}

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  auto_entrepreneur: 'Auto-entrepreneur',
  ei: 'Entreprise individuelle',
  eurl: 'EURL',
  sasu: 'SASU',
  sarl: 'SARL',
  sas: 'SAS',
  sa: 'SA',
}

export const ITEM_UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'unité', label: 'Unité' },
  { value: 'heure', label: 'Heure' },
  { value: 'jour', label: 'Jour' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'm²', label: 'm²' },
  { value: 'kg', label: 'kg' },
  { value: 'lot', label: 'Lot' },
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'prelevement', label: 'Prélèvement' },
  { value: 'autre', label: 'Autre' },
]
