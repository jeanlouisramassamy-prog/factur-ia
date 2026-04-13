// ============================================================
// Génération PDF facture — @react-pdf/renderer
// Template professionnel conforme aux obligations françaises
// ============================================================

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import type { Invoice, InvoiceItem, Business, Client } from './types'
import { LEGAL_MENTIONS, LATE_PENALTY_RATE } from './french-tax'

const colors = {
  primary: '#4f46e5',
  text: '#1e293b',
  muted: '#64748b',
  light: '#f1f5f9',
  border: '#e2e8f0',
  white: '#ffffff',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.text,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: colors.text,
  },
  invoiceNumber: {
    fontSize: 10,
    textAlign: 'right',
    color: colors.muted,
    marginTop: 2,
  },
  // Parties
  parties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  partyBlock: {
    width: '45%',
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: colors.muted,
    lineHeight: 1.5,
  },
  // Info bar
  infoBar: {
    flexDirection: 'row',
    backgroundColor: colors.light,
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
    gap: 30,
  },
  infoItem: {},
  infoLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  colDesc: { width: '40%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '12%', textAlign: 'right' },
  colPrice: { width: '14%', textAlign: 'right' },
  colTVA: { width: '10%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right' },
  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  totalsBlock: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  totalGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    marginTop: 4,
  },
  totalGrandLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  totalGrandValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  // Legal
  legalSection: {
    marginTop: 25,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  legalText: {
    fontSize: 7,
    color: colors.muted,
    lineHeight: 1.6,
  },
  // Bank
  bankSection: {
    marginTop: 15,
    backgroundColor: colors.light,
    borderRadius: 4,
    padding: 10,
  },
  bankLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.muted,
    marginBottom: 4,
  },
  bankDetail: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: colors.muted,
  },
})

function formatCurrencyPDF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDatePDF(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface InvoicePDFData {
  invoice: Invoice
  items: InvoiceItem[]
  business: Business
  client: Client
}

function InvoicePDFDocument({ invoice, items, business, client }: InvoicePDFData) {
  // Group TVA
  const tvaGroups = new Map<number, { base: number; tva: number }>()
  items.forEach((item) => {
    const existing = tvaGroups.get(item.tva_rate) ?? { base: 0, tva: 0 }
    existing.base += item.total_ht
    existing.tva += item.total_ttc - item.total_ht
    tvaGroups.set(item.tva_rate, existing)
  })

  const clientName = client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
  const hasFormationExempt = items.some((it) => it.activity_type === 'formation' && it.tva_rate === 0)

  const e = createElement

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page },
      // Header
      e(View, { style: styles.header },
        e(View, null,
          e(Text, { style: styles.brandName }, business.business_name),
          e(Text, { style: styles.partyDetail },
            [business.address_line1, `${business.postal_code ?? ''} ${business.city ?? ''}`.trim()].filter(Boolean).join('\n')
          ),
          business.siret && e(Text, { style: styles.partyDetail }, `SIRET : ${business.siret}`),
          business.vat_number && e(Text, { style: styles.partyDetail }, `TVA : ${business.vat_number}`),
        ),
        e(View, null,
          e(Text, { style: styles.invoiceTitle }, 'FACTURE'),
          e(Text, { style: styles.invoiceNumber }, invoice.invoice_number),
        ),
      ),

      // Parties
      e(View, { style: styles.parties },
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyLabel }, 'Émetteur'),
          e(Text, { style: styles.partyName }, business.business_name),
          business.email && e(Text, { style: styles.partyDetail }, business.email),
          business.phone && e(Text, { style: styles.partyDetail }, business.phone),
        ),
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyLabel }, 'Client'),
          e(Text, { style: styles.partyName }, clientName),
          client.address_line1 && e(Text, { style: styles.partyDetail }, client.address_line1),
          (client.postal_code || client.city) && e(Text, { style: styles.partyDetail }, `${client.postal_code ?? ''} ${client.city ?? ''}`.trim()),
          client.siret && e(Text, { style: styles.partyDetail }, `SIRET : ${client.siret}`),
          client.email && e(Text, { style: styles.partyDetail }, client.email),
        ),
      ),

      // Info bar
      e(View, { style: styles.infoBar },
        e(View, { style: styles.infoItem },
          e(Text, { style: styles.infoLabel }, 'Date d\'émission'),
          e(Text, { style: styles.infoValue }, formatDatePDF(invoice.issue_date)),
        ),
        invoice.due_date && e(View, { style: styles.infoItem },
          e(Text, { style: styles.infoLabel }, 'Date d\'échéance'),
          e(Text, { style: styles.infoValue }, formatDatePDF(invoice.due_date)),
        ),
        invoice.payment_method && e(View, { style: styles.infoItem },
          e(Text, { style: styles.infoLabel }, 'Mode de paiement'),
          e(Text, { style: styles.infoValue }, invoice.payment_method),
        ),
      ),

      // Table header
      e(View, { style: styles.tableHeader },
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colDesc } }, 'Description'),
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colQty } }, 'Qté'),
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colUnit } }, 'Unité'),
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colPrice } }, 'Prix HT'),
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colTVA } }, 'TVA'),
        e(Text, { style: { ...styles.tableHeaderText, ...styles.colTotal } }, 'Total HT'),
      ),

      // Table rows
      ...items.map((item) =>
        e(View, { key: item.id, style: styles.tableRow },
          e(Text, { style: styles.colDesc }, item.description),
          e(Text, { style: styles.colQty }, String(item.quantity)),
          e(Text, { style: styles.colUnit }, item.unit),
          e(Text, { style: styles.colPrice }, formatCurrencyPDF(item.unit_price_ht)),
          e(Text, { style: styles.colTVA }, `${item.tva_rate} %`),
          e(Text, { style: styles.colTotal }, formatCurrencyPDF(item.total_ht)),
        )
      ),

      // Totals
      e(View, { style: styles.totalsContainer },
        e(View, { style: styles.totalsBlock },
          e(View, { style: styles.totalRow },
            e(Text, { style: styles.totalLabel }, 'Sous-total HT'),
            e(Text, { style: styles.totalValue }, formatCurrencyPDF(invoice.subtotal_ht)),
          ),
          ...Array.from(tvaGroups.entries()).map(([rate, { base, tva }]) =>
            e(View, { key: String(rate), style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, `TVA ${rate} % (base ${formatCurrencyPDF(base)})`),
              e(Text, { style: styles.totalValue }, formatCurrencyPDF(tva)),
            )
          ),
          e(View, { style: styles.totalGrandRow },
            e(Text, { style: styles.totalGrandLabel }, 'Total TTC'),
            e(Text, { style: styles.totalGrandValue }, formatCurrencyPDF(invoice.total_ttc)),
          ),
        ),
      ),

      // Bank details
      business.iban && e(View, { style: styles.bankSection },
        e(Text, { style: styles.bankLabel }, 'Coordonnées bancaires'),
        e(Text, { style: styles.bankDetail }, `IBAN : ${business.iban}`),
        business.bic && e(Text, { style: styles.bankDetail }, `BIC : ${business.bic}`),
      ),

      // Legal mentions
      e(View, { style: styles.legalSection },
        invoice.total_tva === 0 && e(Text, { style: styles.legalText }, LEGAL_MENTIONS.vat_exempt),
        hasFormationExempt && e(Text, { style: styles.legalText }, LEGAL_MENTIONS.formation_exempt),
        e(Text, { style: styles.legalText }, LEGAL_MENTIONS.late_penalty(LATE_PENALTY_RATE)),
        e(Text, { style: styles.legalText }, LEGAL_MENTIONS.recovery_indemnity),
        e(Text, { style: styles.legalText }, LEGAL_MENTIONS.escompte_none),
      ),

      // Notes
      invoice.notes && e(View, { style: { marginTop: 10 } },
        e(Text, { style: { fontSize: 8, color: colors.muted, fontFamily: 'Helvetica-Bold', marginBottom: 3 } }, 'Notes'),
        e(Text, { style: { fontSize: 8, color: colors.text } }, invoice.notes),
      ),

      // Footer
      e(Text, { style: styles.footer },
        `${business.business_name}${business.siret ? ` — SIRET ${business.siret}` : ''}${business.vat_number ? ` — TVA ${business.vat_number}` : ''}`
      ),
    )
  )
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(InvoicePDFDocument as any, data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob()
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
