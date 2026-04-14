// ============================================================
// FEC — Fichier des Écritures Comptables
// Format obligatoire en cas de contrôle fiscal (article L47 A-I LPF)
// ============================================================

import type { Invoice, InvoiceItem, Client } from './types'

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

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  client?: Client
  clientName: string
}

// Libellés comptables PCG pour les comptes de ventes
const PCG_LABELS: Record<string, string> = {
  '701000': 'Ventes de produits finis',
  '706000': 'Prestations de services',
  '706400': 'Prestations de formation',
  '707000': 'Ventes de marchandises',
}

// Sous-comptes TVA par taux
const TVA_ACCOUNTS: Record<number, { compte: string; label: string }> = {
  20:   { compte: '445711', label: 'TVA collectée 20%' },
  10:   { compte: '445712', label: 'TVA collectée 10%' },
  5.5:  { compte: '445713', label: 'TVA collectée 5,5%' },
  2.1:  { compte: '445714', label: 'TVA collectée 2,1%' },
  8.5:  { compte: '445715', label: 'TVA collectée 8,5% (DOM)' },
}

export function generateFEC(invoices: InvoiceWithItems[]): string {
  const headers = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
    'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
  ]

  const lines: string[] = [headers.join('\t')]

  // Toutes les factures sont incluses (le filtrage par période se fait côté requête)
  // Le FEC doit contenir toutes les écritures comptabilisées, y compris annulées
  invoices.forEach((inv, idx) => {
    const ecritureNum = String(idx + 1).padStart(6, '0')
    const date = inv.issue_date.replace(/-/g, '')
    const auxNum = inv.client?.siret || inv.client_id.slice(0, 17)

    // Débit : Client (411000)
    lines.push(
      formatFECLine({
        JournalCode: 'VE',
        JournalLib: 'Ventes',
        EcritureNum: ecritureNum,
        EcritureDate: date,
        CompteNum: '411000',
        CompteLib: 'Clients',
        CompAuxNum: auxNum,
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

    // Crédit : Ventes par compte PCG (706xxx / 707xxx / 701xxx)
    const pcgGroups = new Map<string, number>()
    inv.items.forEach((item) => {
      const pcg = item.pcg_account || '706000'
      pcgGroups.set(pcg, (pcgGroups.get(pcg) ?? 0) + item.total_ht)
    })

    pcgGroups.forEach((amount, pcg) => {
      lines.push(
        formatFECLine({
          JournalCode: 'VE',
          JournalLib: 'Ventes',
          EcritureNum: ecritureNum,
          EcritureDate: date,
          CompteNum: pcg,
          CompteLib: PCG_LABELS[pcg] ?? `Ventes (${pcg})`,
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

    // Crédit : TVA collectée ventilée par taux
    const tvaGroups = new Map<number, number>()
    inv.items.forEach((item) => {
      if (item.tva_rate > 0) {
        const tvaAmount = Math.round(item.total_ht * (item.tva_rate / 100) * 100) / 100
        tvaGroups.set(item.tva_rate, (tvaGroups.get(item.tva_rate) ?? 0) + tvaAmount)
      }
    })

    tvaGroups.forEach((amount, rate) => {
      const tvaAccount = TVA_ACCOUNTS[rate] ?? { compte: '445710', label: `TVA collectée ${rate}%` }
      lines.push(
        formatFECLine({
          JournalCode: 'VE',
          JournalLib: 'Ventes',
          EcritureNum: ecritureNum,
          EcritureDate: date,
          CompteNum: tvaAccount.compte,
          CompteLib: tvaAccount.label,
          CompAuxNum: '',
          CompAuxLib: '',
          PieceRef: inv.invoice_number,
          PieceDate: date,
          EcritureLib: `TVA ${rate}% Facture ${inv.invoice_number}`,
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
