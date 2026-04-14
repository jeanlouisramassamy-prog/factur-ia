import { describe, it, expect } from 'vitest'
import {
  validateSiret,
  validateVatNumber,
  validateIban,
  validateBic,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateFields,
  hasErrors,
} from './validators'

describe('validateSiret', () => {
  it('accepts empty (optional)', () => {
    expect(validateSiret('')).toEqual({ valid: true, message: '' })
  })

  it('rejects non-14-digit strings', () => {
    expect(validateSiret('1234').valid).toBe(false)
    expect(validateSiret('123456789012345').valid).toBe(false)
    expect(validateSiret('abcdefghijklmn').valid).toBe(false)
  })

  it('accepts valid SIRET (La Poste)', () => {
    // 35600000000048 is a well-known valid SIRET (La Poste siège)
    expect(validateSiret('35600000000048')).toEqual({ valid: true, message: '' })
  })

  it('rejects SIRET with bad checksum', () => {
    expect(validateSiret('35600000000049').valid).toBe(false)
  })

  it('strips spaces', () => {
    expect(validateSiret('356 000 000 00048')).toEqual({ valid: true, message: '' })
  })
})

describe('validateVatNumber', () => {
  it('accepts empty (optional)', () => {
    expect(validateVatNumber('')).toEqual({ valid: true, message: '' })
  })

  it('rejects wrong prefix', () => {
    expect(validateVatNumber('DE123456789').valid).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(validateVatNumber('FR1234567890').valid).toBe(false)
    expect(validateVatNumber('FR123456789012').valid).toBe(false)
  })

  it('accepts valid French VAT number', () => {
    // SIREN 356000000 (La Poste) → key = (12 + 3*(356000000 % 97)) % 97
    const siren = 356000000
    const key = (12 + 3 * (siren % 97)) % 97
    const vat = `FR${String(key).padStart(2, '0')}${siren}`
    expect(validateVatNumber(vat)).toEqual({ valid: true, message: '' })
  })

  it('rejects VAT with bad control key', () => {
    expect(validateVatNumber('FR00356000000').valid).toBe(false)
  })
})

describe('validateIban', () => {
  it('accepts empty (optional)', () => {
    expect(validateIban('')).toEqual({ valid: true, message: '' })
  })

  it('rejects too short', () => {
    expect(validateIban('FR761234').valid).toBe(false)
  })

  it('accepts valid French IBAN', () => {
    // Known test IBAN: FR7630006000011234567890189
    expect(validateIban('FR7630006000011234567890189')).toEqual({ valid: true, message: '' })
  })

  it('accepts IBAN with spaces', () => {
    expect(validateIban('FR76 3000 6000 0112 3456 7890 189')).toEqual({ valid: true, message: '' })
  })

  it('rejects IBAN with bad checksum', () => {
    expect(validateIban('FR0030006000011234567890189').valid).toBe(false)
  })
})

describe('validateBic', () => {
  it('accepts empty (optional)', () => {
    expect(validateBic('')).toEqual({ valid: true, message: '' })
  })

  it('accepts 8-char BIC', () => {
    expect(validateBic('BNPAFRPP')).toEqual({ valid: true, message: '' })
  })

  it('accepts 11-char BIC', () => {
    expect(validateBic('BNPAFRPPXXX')).toEqual({ valid: true, message: '' })
  })

  it('rejects invalid BIC', () => {
    expect(validateBic('BNP').valid).toBe(false)
    expect(validateBic('1234FRPP').valid).toBe(false)
  })
})

describe('validateEmail', () => {
  it('accepts empty (optional)', () => {
    expect(validateEmail('')).toEqual({ valid: true, message: '' })
  })

  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toEqual({ valid: true, message: '' })
  })

  it('rejects invalid email', () => {
    expect(validateEmail('not-an-email').valid).toBe(false)
    expect(validateEmail('missing@').valid).toBe(false)
    expect(validateEmail('@nodomain.com').valid).toBe(false)
  })
})

describe('validatePhone', () => {
  it('accepts empty (optional)', () => {
    expect(validatePhone('')).toEqual({ valid: true, message: '' })
  })

  it('accepts French mobile', () => {
    expect(validatePhone('0612345678')).toEqual({ valid: true, message: '' })
  })

  it('accepts with spaces', () => {
    expect(validatePhone('06 12 34 56 78')).toEqual({ valid: true, message: '' })
  })

  it('accepts international format', () => {
    expect(validatePhone('+33612345678')).toEqual({ valid: true, message: '' })
  })

  it('rejects too short', () => {
    expect(validatePhone('061234').valid).toBe(false)
  })
})

describe('validatePostalCode', () => {
  it('accepts empty (optional)', () => {
    expect(validatePostalCode('')).toEqual({ valid: true, message: '' })
  })

  it('accepts valid codes', () => {
    expect(validatePostalCode('75001')).toEqual({ valid: true, message: '' })
    expect(validatePostalCode('97400')).toEqual({ valid: true, message: '' })
  })

  it('rejects invalid codes', () => {
    expect(validatePostalCode('1234').valid).toBe(false)
    expect(validatePostalCode('00100').valid).toBe(false)
    expect(validatePostalCode('ABCDE').valid).toBe(false)
  })
})

describe('validateFields / hasErrors', () => {
  it('returns empty object when all valid', () => {
    const errors = validateFields([
      { field: 'email', result: { valid: true, message: '' } },
      { field: 'phone', result: { valid: true, message: '' } },
    ])
    expect(hasErrors(errors)).toBe(false)
  })

  it('collects errors', () => {
    const errors = validateFields([
      { field: 'email', result: { valid: false, message: 'bad' } },
      { field: 'phone', result: { valid: true, message: '' } },
    ])
    expect(hasErrors(errors)).toBe(true)
    expect(errors.email).toBe('bad')
    expect(errors.phone).toBeUndefined()
  })
})
