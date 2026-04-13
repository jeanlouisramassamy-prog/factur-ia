// ============================================================
// Factur-X XML Generator — Profil BASIC (EN16931 / CII)
// Generates Cross Industry Invoice XML with line items
// for embedding in PDF/A-3
// ============================================================

import type { Invoice, InvoiceItem, Business, Client } from './types'

export interface FacturXData {
  invoice: Invoice
  items: InvoiceItem[]
  business: Business
  client: Client
}

// UN/ECE Rec 20 unit codes
const UNIT_CODES: Record<string, string> = {
  'unité': 'C62',
  'heure': 'HUR',
  'jour': 'DAY',
  'forfait': 'LS',
  'm²': 'MTK',
  'kg': 'KGM',
  'lot': 'C62',
  'session': 'C62',
  'pièce': 'C62',
}

export function generateFacturXBasicXML(data: FacturXData): string {
  const { invoice, items, business, client } = data
  const issueDate = invoice.issue_date.replace(/-/g, '')
  const dueDate = invoice.due_date?.replace(/-/g, '') ?? ''

  // TVA breakdown
  const tvaGroups = new Map<number, { baseHT: number; tva: number }>()
  items.forEach((item) => {
    const existing = tvaGroups.get(item.tva_rate) ?? { baseHT: 0, tva: 0 }
    existing.baseHT += item.total_ht
    existing.tva += item.total_ttc - item.total_ht
    tvaGroups.set(item.tva_rate, existing)
  })

  const clientName = client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()

  // Line items XML
  const lineItemsXml = items.map((item, index) => {
    const unitCode = UNIT_CODES[item.unit] ?? 'C62'
    const categoryCode = item.tva_rate === 0 ? 'E' : 'S'
    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unit_price_ht.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${unitCode}">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${categoryCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.tva_rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${item.total_ht.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
  }).join('')

  // TVA lines
  const tvaLines = Array.from(tvaGroups.entries())
    .map(([rate, { baseHT, tva }]) => `
        <ram:ApplicableTradeTax>
          <ram:CalculatedAmount>${tva.toFixed(2)}</ram:CalculatedAmount>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:BasisAmount>${baseHT.toFixed(2)}</ram:BasisAmount>
          <ram:CategoryCode>${rate === 0 ? 'E' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>`)
    .join('')

  const exemptionReason = business.is_vat_exempt
    ? `\n        <ram:ExemptionReason>TVA non applicable, article 293 B du CGI</ram:ExemptionReason>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(business.business_name)}</ram:Name>
        ${business.siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(business.siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          ${business.address_line1 ? `<ram:LineOne>${esc(business.address_line1)}</ram:LineOne>` : ''}
          ${business.postal_code ? `<ram:PostcodeCode>${esc(business.postal_code)}</ram:PostcodeCode>` : ''}
          ${business.city ? `<ram:CityName>${esc(business.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${business.vat_number ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(business.vat_number)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(clientName)}</ram:Name>
        ${client.siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(client.siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          ${client.address_line1 ? `<ram:LineOne>${esc(client.address_line1)}</ram:LineOne>` : ''}
          ${client.postal_code ? `<ram:PostcodeCode>${esc(client.postal_code)}</ram:PostcodeCode>` : ''}
          ${client.city ? `<ram:CityName>${esc(client.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${client.vat_number ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(client.vat_number)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${tvaLines}${exemptionReason}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoice.subtotal_ht.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoice.subtotal_ht.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${invoice.total_tva.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoice.total_ttc.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${invoice.total_ttc.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      ${dueDate ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${dueDate}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}

// Keep backward-compatible alias
export const generateFacturXMinimumXML = generateFacturXBasicXML

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
