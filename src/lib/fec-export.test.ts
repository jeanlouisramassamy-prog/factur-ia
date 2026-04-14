import { describe, it, expect } from 'vitest'
import { generateFEC } from './fec-export'
import type { InvoiceWithItems } from './fec-export'
import type { InvoiceItem, Client } from './types'

function makeItem(overrides?: Partial<InvoiceItem>): InvoiceItem {
  return {
    id: 'item-1',
    invoice_id: 'inv-1',
    product_id: null,
    description: 'Prestation',
    quantity: 1,
    unit: 'heure',
    unit_price_ht: 1000,
    tva_rate: 20,
    category: 'services',
    activity_type: 'service',
    pcg_account: '706000',
    octroi_de_mer: 0,
    octroi_de_mer_regional: 0,
    total_ht: 1000,
    total_ttc: 1200,
    sort_order: 0,
    created_at: '2026-04-14',
    ...overrides,
  }
}

function makeClient(overrides?: Partial<Client>): Client {
  return {
    id: 'cli-1',
    business_id: 'biz-1',
    company_name: 'Client SAS',
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    address_line1: null,
    address_line2: null,
    postal_code: null,
    country: 'FR',
    city: null,
    siret: '12345678901234',
    vat_number: null,
    notes: null,
    created_at: '2026-01-01',
    ...overrides,
  }
}

function makeInvoice(overrides?: Partial<InvoiceWithItems>): InvoiceWithItems {
  return {
    id: 'inv-1',
    business_id: 'biz-1',
    client_id: 'cli-1',
    invoice_number: 'FA-2026-001',
    status: 'sent',
    issue_date: '2026-04-14',
    due_date: '2026-05-14',
    subtotal_ht: 1000,
    total_tva: 200,
    total_ttc: 1200,
    discount_percent: 0,
    notes: null,
    payment_method: 'virement',
    paid_at: null,
    sent_at: null,
    reminder_sent_at: null,
    pdf_url: null,
    facturx_xml: null,
    facturx_profile: 'BASIC',
    einvoice_status: 'none',
    ppf_id: null,
    created_at: '2026-04-14',
    items: [makeItem()],
    client: makeClient(),
    clientName: 'Client SAS',
    ...overrides,
  } as InvoiceWithItems
}

describe('generateFEC', () => {
  it('generates header row with 18 columns', () => {
    const fec = generateFEC([])
    const header = fec.split('\n')[0]
    const cols = header.split('\t')
    expect(cols).toHaveLength(18)
    expect(cols[0]).toBe('JournalCode')
    expect(cols[17]).toBe('Idevise')
  })

  it('generates debit line for client (411000)', () => {
    const fec = generateFEC([makeInvoice()])
    const lines = fec.split('\n')
    const debitLine = lines[1].split('\t')
    expect(debitLine[4]).toBe('411000')   // CompteNum
    expect(debitLine[5]).toBe('Clients')  // CompteLib
    expect(debitLine[11]).toBe('1200.00') // Debit (TTC)
    expect(debitLine[12]).toBe('0.00')    // Credit
  })

  it('uses SIRET as CompAuxNum when available', () => {
    const fec = generateFEC([makeInvoice()])
    const debitLine = fec.split('\n')[1].split('\t')
    expect(debitLine[6]).toBe('12345678901234') // CompAuxNum = SIRET
  })

  it('falls back to client_id when no SIRET', () => {
    const inv = makeInvoice({ client: makeClient({ siret: null }) })
    const fec = generateFEC([inv])
    const debitLine = fec.split('\n')[1].split('\t')
    expect(debitLine[6]).toBe('cli-1') // truncated client_id
  })

  it('generates credit line for sales account (706000)', () => {
    const fec = generateFEC([makeInvoice()])
    const lines = fec.split('\n')
    const creditLine = lines[2].split('\t')
    expect(creditLine[4]).toBe('706000')
    expect(creditLine[5]).toBe('Prestations de services')
    expect(creditLine[11]).toBe('0.00')     // Debit
    expect(creditLine[12]).toBe('1000.00')  // Credit (HT)
  })

  it('generates TVA line with correct sub-account', () => {
    const fec = generateFEC([makeInvoice()])
    const lines = fec.split('\n')
    const tvaLine = lines[3].split('\t')
    expect(tvaLine[4]).toBe('445711')  // TVA 20% sub-account
    expect(tvaLine[5]).toBe('TVA collectée 20%')
    expect(tvaLine[12]).toBe('200.00') // Credit (TVA)
  })

  it('uses PCG label for known accounts', () => {
    const inv = makeInvoice({
      items: [makeItem({ pcg_account: '707000' })],
    })
    const fec = generateFEC([inv])
    const creditLine = fec.split('\n')[2].split('\t')
    expect(creditLine[5]).toBe('Ventes de marchandises')
  })

  it('handles unknown PCG account gracefully', () => {
    const inv = makeInvoice({
      items: [makeItem({ pcg_account: '708000' })],
    })
    const fec = generateFEC([inv])
    const creditLine = fec.split('\n')[2].split('\t')
    expect(creditLine[5]).toBe('Ventes (708000)')
  })

  it('groups items by PCG account', () => {
    const inv = makeInvoice({
      items: [
        makeItem({ pcg_account: '706000', total_ht: 500 }),
        makeItem({ id: 'item-2', pcg_account: '706000', total_ht: 300 }),
        makeItem({ id: 'item-3', pcg_account: '707000', total_ht: 200 }),
      ],
      subtotal_ht: 1000,
      total_tva: 200,
      total_ttc: 1200,
    })
    const fec = generateFEC([inv])
    const lines = fec.split('\n')
    // header + debit + 2 PCG groups + TVA = 5 lines
    expect(lines.length).toBe(5)
    // First PCG group: 706000 = 800
    const pcg706 = lines[2].split('\t')
    expect(pcg706[4]).toBe('706000')
    expect(pcg706[12]).toBe('800.00')
  })

  it('ventilates TVA by rate', () => {
    const inv = makeInvoice({
      items: [
        makeItem({ tva_rate: 20, total_ht: 500 }),
        makeItem({ id: 'item-2', tva_rate: 5.5, total_ht: 500 }),
      ],
    })
    const fec = generateFEC([inv])
    const lines = fec.split('\n')
    // Find TVA lines
    const tvaLines = lines.filter((l) => l.includes('44571'))
    expect(tvaLines).toHaveLength(2)

    const tva20 = tvaLines.find((l) => l.includes('445711'))!.split('\t')
    expect(tva20[12]).toBe('100.00') // 500 * 20%

    const tva55 = tvaLines.find((l) => l.includes('445713'))!.split('\t')
    expect(tva55[12]).toBe('27.50') // 500 * 5.5%
  })

  it('skips TVA line for 0% items', () => {
    const inv = makeInvoice({
      items: [makeItem({ tva_rate: 0, total_ttc: 1000 })],
      total_tva: 0,
      total_ttc: 1000,
    })
    const fec = generateFEC([inv])
    const lines = fec.split('\n')
    const tvaLines = lines.filter((l) => l.includes('44571'))
    expect(tvaLines).toHaveLength(0)
  })

  it('formats date as YYYYMMDD', () => {
    const fec = generateFEC([makeInvoice()])
    const debitLine = fec.split('\n')[1].split('\t')
    expect(debitLine[3]).toBe('20260414') // EcritureDate
  })

  it('includes all invoice statuses (no filtering)', () => {
    const invoices = [
      makeInvoice({ status: 'draft', invoice_number: 'FA-001' }),
      makeInvoice({ id: 'inv-2', status: 'cancelled', invoice_number: 'FA-002' }),
      makeInvoice({ id: 'inv-3', status: 'overdue', invoice_number: 'FA-003' }),
    ]
    const fec = generateFEC(invoices)
    expect(fec).toContain('FA-001')
    expect(fec).toContain('FA-002')
    expect(fec).toContain('FA-003')
  })

  it('uses EUR as currency', () => {
    const fec = generateFEC([makeInvoice()])
    const debitLine = fec.split('\n')[1].split('\t')
    expect(debitLine[17]).toBe('EUR')
  })

  it('increments EcritureNum per invoice', () => {
    const invoices = [
      makeInvoice({ invoice_number: 'FA-001' }),
      makeInvoice({ id: 'inv-2', invoice_number: 'FA-002' }),
    ]
    const fec = generateFEC(invoices)
    const lines = fec.split('\n')
    expect(lines[1].split('\t')[2]).toBe('000001')
    // Find first line of second invoice
    const inv2Line = lines.find((l) => l.includes('FA-002') && l.includes('411000'))!
    expect(inv2Line.split('\t')[2]).toBe('000002')
  })
})
