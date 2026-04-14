import { describe, it, expect } from 'vitest'
import { generateFacturXBasicXML, generateFacturXMinimumXML } from './facturx-xml'
import type { FacturXData } from './facturx-xml'
import type { Invoice, InvoiceItem, Business, Client } from './types'

function makeBusiness(overrides?: Partial<Business>): Business {
  return {
    id: 'biz-1',
    owner_id: 'owner-1',
    business_name: 'Test SARL',
    legal_form: 'sarl',
    siret: '35600000000048',
    vat_number: 'FR40356000000',
    is_vat_exempt: false,
    address_line1: '1 rue du Test',
    postal_code: '75001',
    city: 'Paris',
    phone: '0612345678',
    email: 'test@example.com',
    website: null,
    iban: null,
    bic: null,
    invoice_prefix: 'FA',
    quote_prefix: 'DE',
    next_invoice_number: 2,
    next_quote_number: 1,
    payment_terms_days: 30,
    default_payment_method: 'virement',
    fiscal_year_start: '01-01',
    plan: 'solo',
    territoire: 'metropole',
    assujetti_octroi_de_mer: false,
    acre_dom_annee: null,
    exoneration_tva_formation: false,
    created_at: '2026-01-01',
    ...overrides,
  } as Business
}

function makeClient(overrides?: Partial<Client>): Client {
  return {
    id: 'cli-1',
    business_id: 'biz-1',
    company_name: 'Client SAS',
    first_name: null,
    last_name: null,
    email: 'client@test.fr',
    phone: null,
    address_line1: '2 avenue du Client',
    address_line2: null,
    postal_code: '69001',
    country: 'FR',
    city: 'Lyon',
    siret: null,
    vat_number: null,
    notes: null,
    created_at: '2026-01-01',
    ...overrides,
  }
}

function makeInvoice(overrides?: Partial<Invoice>): Invoice {
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
    ...overrides,
  }
}

function makeItem(overrides?: Partial<InvoiceItem>): InvoiceItem {
  return {
    id: 'item-1',
    invoice_id: 'inv-1',
    product_id: null,
    description: 'Prestation de conseil',
    quantity: 10,
    unit: 'heure',
    unit_price_ht: 100,
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

describe('generateFacturXBasicXML', () => {
  const data: FacturXData = {
    invoice: makeInvoice(),
    items: [makeItem()],
    business: makeBusiness(),
    client: makeClient(),
  }

  it('generates valid XML header', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('CrossIndustryInvoice')
  })

  it('declares BASIC profile', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('urn:factur-x.eu:1p0:basic')
  })

  it('includes invoice number', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:ID>FA-2026-001</ram:ID>')
  })

  it('includes issue date in 102 format', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('20260414')
  })

  it('includes seller info', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:Name>Test SARL</ram:Name>')
    expect(xml).toContain('35600000000048')
    expect(xml).toContain('FR40356000000')
  })

  it('includes buyer info', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:Name>Client SAS</ram:Name>')
    expect(xml).toContain('69001')
    expect(xml).toContain('Lyon')
  })

  it('includes line items', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('IncludedSupplyChainTradeLineItem')
    expect(xml).toContain('Prestation de conseil')
    expect(xml).toContain('<ram:ChargeAmount>100.00</ram:ChargeAmount>')
    expect(xml).toContain('unitCode="HUR"')
    expect(xml).toContain('<ram:BilledQuantity')
  })

  it('includes monetary totals', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:LineTotalAmount>1000.00</ram:LineTotalAmount>')
    expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">200.00</ram:TaxTotalAmount>')
    expect(xml).toContain('<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>')
  })

  it('includes TVA breakdown', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>')
    expect(xml).toContain('<ram:CategoryCode>S</ram:CategoryCode>')
  })

  it('includes due date', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('20260514')
    expect(xml).toContain('SpecifiedTradePaymentTerms')
  })

  it('uses category E for 0% TVA', () => {
    const exemptData: FacturXData = {
      ...data,
      items: [makeItem({ tva_rate: 0, total_ttc: 1000 })],
    }
    const xml = generateFacturXBasicXML(exemptData)
    expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>')
  })

  it('adds exemption reason for VAT-exempt businesses', () => {
    const exemptData: FacturXData = {
      ...data,
      business: makeBusiness({ is_vat_exempt: true }),
    }
    const xml = generateFacturXBasicXML(exemptData)
    expect(xml).toContain('article 293 B du CGI')
  })

  it('escapes XML special characters', () => {
    const specialData: FacturXData = {
      ...data,
      items: [makeItem({ description: 'Test <&> "quotes"' })],
    }
    const xml = generateFacturXBasicXML(specialData)
    expect(xml).toContain('Test &lt;&amp;&gt; &quot;quotes&quot;')
    expect(xml).not.toContain('Test <&>')
  })

  it('handles client with only first/last name (particulier)', () => {
    const partData: FacturXData = {
      ...data,
      client: makeClient({ company_name: null, first_name: 'Jean', last_name: 'Dupont' }),
    }
    const xml = generateFacturXBasicXML(partData)
    expect(xml).toContain('<ram:Name>Jean Dupont</ram:Name>')
  })

  it('uses EUR currency', () => {
    const xml = generateFacturXBasicXML(data)
    expect(xml).toContain('<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>')
  })
})

describe('generateFacturXMinimumXML alias', () => {
  it('is the same function as generateFacturXBasicXML', () => {
    expect(generateFacturXMinimumXML).toBe(generateFacturXBasicXML)
  })
})
