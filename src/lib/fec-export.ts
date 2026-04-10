// ============================================================
// FEC — Fichier des Écritures Comptables
// Format obligatoire en cas de contrôle fiscal (article L47 A-I LPF)
// ============================================================

import type { Invoice, InvoiceItem } from './types'

interface FECEntry {
  JournalCode: string
  JournalLib: string
  EcritureNum: string
  EcritureDate: string
  CompteNum: string
  CompteLib: string
  CompAuxNum: string
  CompAuxLib: string
  PieceRef: string
  PieceDate: string
  EcritureLib: string
  Debit: string
  Credit: string
  EcritureLet: string
  DateLet: string
  ValidDate: string
  Montantdevise: string
  Idevise: string
}

interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  clientName: string
}

export function generateFEC(invoices: InvoiceWithItems[], _businessName: string): string {
  const headers = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
    'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
  ]

  const lines: string[] = [headers.join('\t')]

  invoices
    .filter((inv) => inv.status === 'paid' || inv.status === 'sent')
    .forEach((inv, idx) => {
      const ecritureNum = String(idx + 1).padStart(6, '0')
      const date = inv.issue_date.replace(/-/g, '')

      // Débit : Client (411000)
      lines.push(
        formatFECLine({
          JournalCode: 'VE',
          JournalLib: 'Ventes',
          EcritureNum: ecritureNum,
          EcritureDate: date,
          CompteNum: '411000',
          CompteLib: 'Clients',
          CompAuxNum: inv.client_id.slice(0, 17),
          CompAuxLib: inv.clientName,
          PieceRef: inv.invoice_number,
          PieceDate: date,
          EcritureLib: `Facture ${inv.invoice_number} - ${inv.clientName}`,
          Debit: inv.total_ttc.toFixed(2),
          Credit: '0.00',
          EcritureLet: '',
          DateLet: '',
          ValidDate: date,
          Montantdevise: inv.total_ttc.toFixed(2),
          Idevise: 'EUR',
        })
      )

      // Crédit : Ventes par catégorie (PCG 706xxx / 707xxx)
      // Group items by PCG account
      const pcgGroups = new Map<string, { amount: number; label: string }>()
      inv.items.forEach((item) => {
        const pcg = item.pcg_account || '706000'
        const existing = pcgGroups.get(pcg) ?? { amount: 0, label: item.category }
        existing.amount += item.total_ht
        pcgGroups.set(pcg, existing)
      })

      pcgGroups.forEach(({ amount, label }, pcg) => {
        lines.push(
          formatFECLine({
            JournalCode: 'VE',
            JournalLib: 'Ventes',
            EcritureNum: ecritureNum,
            EcritureDate: date,
            CompteNum: pcg,
            CompteLib: `Ventes ${label}`,
            CompAuxNum: '',
            CompAuxLib: '',
            PieceRef: inv.invoice_number,
            PieceDate: date,
            EcritureLib: `Facture ${inv.invoice_number}`,
            Debit: '0.00',
            Credit: amount.toFixed(2),
            EcritureLet: '',
            DateLet: '',
            ValidDate: date,
            Montantdevise: amount.toFixed(2),
            Idevise: 'EUR',
          })
        )
      })

      // Crédit : TVA collectée (445710)
      if (inv.total_tva > 0) {
        lines.push(
          formatFECLine({
            JournalCode: 'VE',
            JournalLib: 'Ventes',
            EcritureNum: ecritureNum,
            EcritureDate: date,
            CompteNum: '445710',
            CompteLib: 'TVA collectée',
            CompAuxNum: '',
            CompAuxLib: '',
            PieceRef: inv.invoice_number,
            PieceDate: date,
            EcritureLib: `TVA Facture ${inv.invoice_number}`,
            Debit: '0.00',
            Credit: inv.total_tva.toFixed(2),
            EcritureLet: '',
            DateLet: '',
            ValidDate: date,
            Montantdevise: inv.total_tva.toFixed(2),
            Idevise: 'EUR',
          })
        )
      }
    })

  return lines.join('\n')
}

function formatFECLine(entry: FECEntry): string {
  return [
    entry.JournalCode, entry.JournalLib, entry.EcritureNum, entry.EcritureDate,
    entry.CompteNum, entry.CompteLib, entry.CompAuxNum, entry.CompAuxLib,
    entry.PieceRef, entry.PieceDate, entry.EcritureLib, entry.Debit, entry.Credit,
    entry.EcritureLet, entry.DateLet, entry.ValidDate, entry.Montantdevise, entry.Idevise,
  ].join('\t')
}

export function downloadFEC(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
