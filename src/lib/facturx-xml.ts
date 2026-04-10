// ============================================================
// Factur-X XML Generator — Profil MINIMUM (EN16931 / CII)
// Generates Cross Industry Invoice XML for embedding in PDF/A-3
// ============================================================

import type { Invoice, InvoiceItem, Business, Client } from './types'

interface FacturXData {
  invoice: Invoice
  items: InvoiceItem[]
  business: Business
  client: Client
}

export function generateFacturXMinimumXML(data: FacturXData): string {
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

  const tvaLines = Array.from(tvaGroups.entries())
    .map(
      ([rate, { baseHT, tva }]) => `
        <ram:ApplicableTradeTax>
          <ram:CalculatedAmount>${tva.toFixed(2)}</ram:CalculatedAmount>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:BasisAmount>${baseHT.toFixed(2)}</ram:BasisAmount>
          <ram:CategoryCode>${rate === 0 ? 'E' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${rate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>`
    )
    .join('')

  const exemptionReason = business.is_vat_exempt
    ? `<ram:ExemptionReason>TVA non applicable, article 293 B du CGI</ram:ExemptionReason>`
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(business.business_name)}</ram:Name>
        ${business.siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${escapeXml(business.siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          ${business.address_line1 ? `<ram:LineOne>${escapeXml(business.address_line1)}</ram:LineOne>` : ''}
          ${business.postal_code ? `<ram:PostcodeCode>${escapeXml(business.postal_code)}</ram:PostcodeCode>` : ''}
          ${business.city ? `<ram:CityName>${escapeXml(business.city)}</ram:CityName>` : ''}
          <ram:CountryID>${business.country === 'France' ? 'FR' : 'FR'}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${business.vat_number ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(business.vat_number)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim())}</ram:Name>
        ${client.siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${escapeXml(client.siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          ${client.address_line1 ? `<ram:LineOne>${escapeXml(client.address_line1)}</ram:LineOne>` : ''}
          ${client.postal_code ? `<ram:PostcodeCode>${escapeXml(client.postal_code)}</ram:PostcodeCode>` : ''}
          ${client.city ? `<ram:CityName>${escapeXml(client.city)}</ram:CityName>` : ''}
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${client.vat_number ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(client.vat_number)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${tvaLines}
      ${exemptionReason}
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

  return xml
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
