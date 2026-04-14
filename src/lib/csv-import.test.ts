import { describe, it, expect } from 'vitest'
import { parseCSV, mapCSVToClients, mapCSVToProducts, generateCSVTemplate } from './csv-import'

describe('parseCSV', () => {
  it('splits by comma', () => {
    const result = parseCSV('a,b,c\n1,2,3')
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('splits by semicolon', () => {
    const result = parseCSV('a;b;c\n1;2;3')
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('handles quoted values with commas', () => {
    const result = parseCSV('name,address\n"Dupont, Jean","1, rue de la Paix"')
    expect(result[1][0]).toBe('Dupont, Jean')
    expect(result[1][1]).toBe('1, rue de la Paix')
  })

  it('handles escaped quotes', () => {
    const result = parseCSV('name\n"Société ""ABC"""')
    expect(result[1][0]).toBe('Société "ABC"')
  })

  it('skips empty lines', () => {
    const result = parseCSV('a,b\n\n1,2\n\n')
    expect(result).toHaveLength(2)
  })

  it('handles CRLF line endings', () => {
    const result = parseCSV('a,b\r\n1,2\r\n')
    expect(result).toEqual([['a', 'b'], ['1', '2']])
  })

  it('trims whitespace from values', () => {
    const result = parseCSV('  a , b  \n 1 , 2 ')
    expect(result).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('mapCSVToClients', () => {
  it('maps French column headers', () => {
    const parsed = parseCSV('Raison sociale,Email,Téléphone\nTest SARL,test@example.com,0612345678')
    const result = mapCSVToClients(parsed)
    expect(result.validCount).toBe(1)
    expect(result.rows[0].data.company_name).toBe('Test SARL')
    expect(result.rows[0].data.email).toBe('test@example.com')
  })

  it('requires company_name or last_name', () => {
    const parsed = parseCSV('Email\ntest@example.com')
    const result = mapCSVToClients(parsed)
    expect(result.rows[0].valid).toBe(false)
    expect(result.rows[0].errors[0]).toContain('Raison sociale ou Nom requis')
  })

  it('validates SIRET', () => {
    const parsed = parseCSV('Nom,SIRET\nDupont,12345')
    const result = mapCSVToClients(parsed)
    expect(result.rows[0].valid).toBe(false)
    expect(result.rows[0].errors[0]).toContain('SIRET')
  })

  it('validates email format', () => {
    const parsed = parseCSV('Nom,Email\nDupont,not-an-email')
    const result = mapCSVToClients(parsed)
    expect(result.rows[0].valid).toBe(false)
  })

  it('accepts valid rows', () => {
    const parsed = parseCSV('Raison sociale,Prénom,Nom,Email,Ville\nTest SAS,Jean,Dupont,jean@test.fr,Paris')
    const result = mapCSVToClients(parsed)
    expect(result.validCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(result.rows[0].data.first_name).toBe('Jean')
    expect(result.rows[0].data.city).toBe('Paris')
  })

  it('returns 0 for empty CSV', () => {
    const result = mapCSVToClients([['header']])
    expect(result.validCount).toBe(0)
  })

  it('returns 0 when no columns match', () => {
    const parsed = parseCSV('foo,bar\n1,2')
    const result = mapCSVToClients(parsed)
    expect(result.rows).toHaveLength(0)
  })
})

describe('mapCSVToProducts', () => {
  it('maps product columns', () => {
    const parsed = parseCSV('Nom,Prix HT,Unité\nSite web,1500,forfait')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.validCount).toBe(1)
    expect(result.rows[0].data.name).toBe('Site web')
    expect(result.rows[0].data.default_price_ht).toBe('1500')
    expect(result.rows[0].data.unit).toBe('forfait')
  })

  it('requires name', () => {
    const parsed = parseCSV('Prix HT\n100')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].valid).toBe(false)
    expect(result.rows[0].errors[0]).toContain('Nom requis')
  })

  it('resolves category by label', () => {
    const parsed = parseCSV('Nom,Catégorie\nTest,Prestation de service')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].data.category).toBe('prestation_generale')
  })

  it('rejects unknown category', () => {
    const parsed = parseCSV('Nom,Catégorie\nTest,Catégorie Inexistante')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].valid).toBe(false)
    expect(result.rows[0].errors[0]).toContain('Catégorie inconnue')
  })

  it('defaults to prestation_generale when no category', () => {
    const parsed = parseCSV('Nom\nTest')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].data.category).toBe('prestation_generale')
  })

  it('defaults to exempt_293b for exempt business', () => {
    const parsed = parseCSV('Nom\nTest')
    const result = mapCSVToProducts(parsed, true, 'metropole')
    expect(result.rows[0].data.category).toBe('exempt_293b')
  })

  it('validates price format', () => {
    const parsed = parseCSV('Nom,Prix HT\nTest,abc')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].valid).toBe(false)
    expect(result.rows[0].errors[0]).toContain('Prix HT invalide')
  })

  it('handles comma as decimal separator in quoted value', () => {
    const parsed = parseCSV('Nom;Prix HT\nTest;"15,50"')
    const result = mapCSVToProducts(parsed, false, 'metropole')
    expect(result.rows[0].data.default_price_ht).toBe('15.5')
  })
})

describe('generateCSVTemplate', () => {
  it('generates client template with headers and example', () => {
    const csv = generateCSVTemplate('clients')
    expect(csv).toContain('Raison sociale')
    expect(csv).toContain('SIRET')
    expect(csv).toContain('35600000000048')
  })

  it('generates product template with headers and examples', () => {
    const csv = generateCSVTemplate('products')
    expect(csv).toContain('Nom')
    expect(csv).toContain('Prix HT')
    expect(csv).toContain('Création site web')
  })
})
