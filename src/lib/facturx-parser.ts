// ============================================================
// Factur-X Parser — Import factures fournisseurs
// Parse un fichier XML CII (Cross Industry Invoice) et retourne
// des données structurées pour pré-remplir une dépense.
// Accepte un fichier XML direct ou tente l'extraction depuis un PDF.
// ============================================================

export interface ParsedFacturXLine {
  lineId: string
  description: string
  quantity: number
  unitPriceHT: number
  totalHT: number
  tvaRate: number
}

export interface ParsedFacturX {
  invoiceNumber: string
  issueDate: string
  dueDate: string | null
  supplierName: string
  supplierSiret: string | null
  supplierVatNumber: string | null
  buyerName: string
  buyerSiret: string | null
  totalHT: number
  totalTVA: number
  totalTTC: number
  currency: string
  lines: ParsedFacturXLine[]
  tvaBreakdown: { rate: number; base: number; amount: number }[]
  rawXml: string
}

const NS = {
  rsm: 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
  ram: 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
  udt: 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
}

function getEl(parent: Element | Document, nsPrefix: keyof typeof NS, localName: string): Element | null {
  const els = parent instanceof Document
    ? parent.getElementsByTagNameNS(NS[nsPrefix], localName)
    : parent.getElementsByTagNameNS(NS[nsPrefix], localName)
  return els[0] ?? null
}

function getText(parent: Element | Document, nsPrefix: keyof typeof NS, localName: string): string {
  return getEl(parent, nsPrefix, localName)?.textContent?.trim() ?? ''
}

function parseDate(raw: string): string {
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

/**
 * Parse a Factur-X XML string into structured data.
 */
export function parseFacturXml(xmlString: string): ParsedFacturX | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'application/xml')

    // Check for parse errors
    if (doc.querySelector('parsererror')) return null

    // Invoice number & date
    const exchangedDoc = getEl(doc, 'rsm', 'ExchangedDocument')
    const invoiceNumber = exchangedDoc ? getText(exchangedDoc, 'ram', 'ID') : ''
    const dateRaw = exchangedDoc
      ? getText(
          getEl(exchangedDoc, 'ram', 'IssueDateTime') ?? exchangedDoc,
          'udt', 'DateTimeString'
        )
      : ''
    const issueDate = parseDate(dateRaw)

    // Transaction
    const transaction = getEl(doc, 'rsm', 'SupplyChainTradeTransaction')
    if (!transaction) return null

    const agreement = getEl(transaction, 'ram', 'ApplicableHeaderTradeAgreement')
    const settlement = getEl(transaction, 'ram', 'ApplicableHeaderTradeSettlement')

    // Seller (fournisseur)
    const seller = agreement ? getEl(agreement, 'ram', 'SellerTradeParty') : null
    const supplierName = seller ? getText(seller, 'ram', 'Name') : ''
    const sellerOrg = seller ? getEl(seller, 'ram', 'SpecifiedLegalOrganization') : null
    const supplierSiret = sellerOrg ? getText(sellerOrg, 'ram', 'ID') : null
    const sellerTax = seller ? getEl(seller, 'ram', 'SpecifiedTaxRegistration') : null
    const supplierVatNumber = sellerTax ? getText(sellerTax, 'ram', 'ID') : null

    // Buyer
    const buyer = agreement ? getEl(agreement, 'ram', 'BuyerTradeParty') : null
    const buyerName = buyer ? getText(buyer, 'ram', 'Name') : ''
    const buyerOrg = buyer ? getEl(buyer, 'ram', 'SpecifiedLegalOrganization') : null
    const buyerSiret = buyerOrg ? getText(buyerOrg, 'ram', 'ID') : null

    // Totals
    const summation = settlement ? getEl(settlement, 'ram', 'SpecifiedTradeSettlementHeaderMonetarySummation') : null
    const totalHT = parseFloat(summation ? getText(summation, 'ram', 'TaxBasisTotalAmount') : '0')
    const totalTVA = parseFloat(summation ? getText(summation, 'ram', 'TaxTotalAmount') : '0')
    const totalTTC = parseFloat(summation ? getText(summation, 'ram', 'GrandTotalAmount') : '0')
    const currency = settlement ? getText(settlement, 'ram', 'InvoiceCurrencyCode') : 'EUR'

    // Due date
    const paymentTerms = settlement ? getEl(settlement, 'ram', 'SpecifiedTradePaymentTerms') : null
    const dueDateRaw = paymentTerms
      ? getText(
          getEl(paymentTerms, 'ram', 'DueDateDateTime') ?? paymentTerms,
          'udt', 'DateTimeString'
        )
      : ''
    const dueDate = dueDateRaw ? parseDate(dueDateRaw) : null

    // TVA breakdown
    const taxElements = settlement
      ? Array.from(settlement.getElementsByTagNameNS(NS.ram, 'ApplicableTradeTax'))
      : []
    const tvaBreakdown = taxElements.map((tax) => ({
      rate: parseFloat(getText(tax, 'ram', 'RateApplicablePercent') || '0'),
      base: parseFloat(getText(tax, 'ram', 'BasisAmount') || '0'),
      amount: parseFloat(getText(tax, 'ram', 'CalculatedAmount') || '0'),
    }))

    // Line items
    const lineElements = Array.from(
      transaction.getElementsByTagNameNS(NS.ram, 'IncludedSupplyChainTradeLineItem')
    )
    const lines: ParsedFacturXLine[] = lineElements.map((line) => {
      const lineDoc = getEl(line, 'ram', 'AssociatedDocumentLineDocument')
      const lineId = lineDoc ? getText(lineDoc, 'ram', 'LineID') : ''
      const product = getEl(line, 'ram', 'SpecifiedTradeProduct')
      const description = product ? getText(product, 'ram', 'Name') : ''
      const delivery = getEl(line, 'ram', 'SpecifiedLineTradeDelivery')
      const quantity = parseFloat(delivery ? getText(delivery, 'ram', 'BilledQuantity') : '1')
      const agreement2 = getEl(line, 'ram', 'SpecifiedLineTradeAgreement')
      const price = agreement2 ? getEl(agreement2, 'ram', 'NetPriceProductTradePrice') : null
      const unitPriceHT = parseFloat(price ? getText(price, 'ram', 'ChargeAmount') : '0')
      const lineSettlement = getEl(line, 'ram', 'SpecifiedLineTradeSettlement')
      const lineSummation = lineSettlement ? getEl(lineSettlement, 'ram', 'SpecifiedTradeSettlementLineMonetarySummation') : null
      const totalLineHT = parseFloat(lineSummation ? getText(lineSummation, 'ram', 'LineTotalAmount') : '0')
      const lineTax = lineSettlement ? getEl(lineSettlement, 'ram', 'ApplicableTradeTax') : null
      const tvaRate = parseFloat(lineTax ? getText(lineTax, 'ram', 'RateApplicablePercent') : '0')

      return { lineId, description, quantity, unitPriceHT, totalHT: totalLineHT, tvaRate }
    })

    return {
      invoiceNumber,
      issueDate,
      dueDate,
      supplierName,
      supplierSiret: supplierSiret || null,
      supplierVatNumber: supplierVatNumber || null,
      buyerName,
      buyerSiret: buyerSiret || null,
      totalHT,
      totalTVA,
      totalTTC,
      currency,
      lines,
      tvaBreakdown,
      rawXml: xmlString,
    }
  } catch {
    return null
  }
}

/**
 * Try to extract XML from a file. Accepts .xml files directly
 * or extracts the Factur-X XML attachment from a PDF/A-3 using pdfjs-dist.
 */
export async function extractFacturXFromFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase()

  // Direct XML file
  if (name.endsWith('.xml')) {
    return await file.text()
  }

  // PDF file — extract XML attachment via pdfjs-dist
  if (name.endsWith('.pdf')) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())

      // Dynamic import — pdfjs-dist is heavy and only needed on import
      const pdfjs = await import('pdfjs-dist')
      // Bundle the worker via Vite's ?url import so version always matches
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

      const loadingTask = pdfjs.getDocument({
        data: bytes,
        isEvalSupported: false,
        useSystemFonts: true,
      })
      const pdf = await loadingTask.promise
      const attachments = await pdf.getAttachments()

      if (!attachments) {
        // Fallback: naive text search for uncompressed XML
        return fallbackTextSearch(bytes)
      }

      // Look for a factur-x.xml or zugferd-invoice.xml attachment
      for (const [filename, attachment] of Object.entries(attachments)) {
        const lower = filename.toLowerCase()
        if (lower.endsWith('.xml')) {
          const att = attachment as { content: Uint8Array | ArrayBuffer }
          const content = att.content instanceof Uint8Array
            ? att.content
            : new Uint8Array(att.content)
          return new TextDecoder('utf-8').decode(content)
        }
      }

      // No XML attachment found — fallback to text search
      return fallbackTextSearch(bytes)
    } catch (err) {
      console.error('PDF parsing error:', err)
      return null
    }
  }

  return null
}

function fallbackTextSearch(bytes: Uint8Array): string | null {
  const text = new TextDecoder('latin1').decode(bytes)
  const xmlStart = text.indexOf('<?xml')
  if (xmlStart === -1) return null
  const ciiStart = text.indexOf('<rsm:CrossIndustryInvoice', xmlStart)
  if (ciiStart === -1) return null
  const ciiEnd = text.indexOf('</rsm:CrossIndustryInvoice>', ciiStart)
  if (ciiEnd === -1) return null
  const xmlContent = text.slice(ciiStart, ciiEnd + '</rsm:CrossIndustryInvoice>'.length)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`
}
