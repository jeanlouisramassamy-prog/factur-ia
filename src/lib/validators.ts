// ============================================================
// Validators — Validation des champs métier français
// ============================================================

export interface ValidationResult {
  valid: boolean
  message: string
}

const ok: ValidationResult = { valid: true, message: '' }
const fail = (message: string): ValidationResult => ({ valid: false, message })

// --- SIRET (14 chiffres, algorithme de Luhn) ---

export function validateSiret(siret: string): ValidationResult {
  if (!siret) return ok // optionnel
  const digits = siret.replace(/\s/g, '')
  if (!/^\d{14}$/.test(digits)) return fail('Le SIRET doit contenir exactement 14 chiffres.')
  // Algorithme de Luhn sur 14 chiffres
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let n = parseInt(digits[i], 10)
    if (i % 2 === 0) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  if (sum % 10 !== 0) return fail('SIRET invalide (somme de contrôle incorrecte).')
  return ok
}

// --- N° TVA intracommunautaire français (FR + 2 chiffres clé + SIREN 9 chiffres) ---

export function validateVatNumber(vat: string): ValidationResult {
  if (!vat) return ok
  const clean = vat.replace(/\s/g, '').toUpperCase()
  if (!/^FR\d{11}$/.test(clean)) return fail('Le n° TVA doit être au format FR + 11 chiffres (ex: FR12345678901).')
  // Clé de contrôle : les 2 chiffres après FR = (12 + 3 * (SIREN % 97)) % 97
  const key = parseInt(clean.slice(2, 4), 10)
  const siren = parseInt(clean.slice(4), 10)
  const expected = (12 + 3 * (siren % 97)) % 97
  if (key !== expected) return fail('N° TVA invalide (clé de contrôle incorrecte).')
  return ok
}

// --- IBAN (format international, validation mod 97) ---

export function validateIban(iban: string): ValidationResult {
  if (!iban) return ok
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (clean.length < 15 || clean.length > 34) return fail('IBAN invalide (15 à 34 caractères).')
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return fail('Format IBAN invalide (ex: FR76 1234 5678 ...).')
  // Validation mod 97 (ISO 7064)
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))
  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97
  }
  if (remainder !== 1) return fail('IBAN invalide (somme de contrôle incorrecte).')
  return ok
}

// --- BIC/SWIFT (8 ou 11 caractères alphanumériques) ---

export function validateBic(bic: string): ValidationResult {
  if (!bic) return ok
  const clean = bic.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean))
    return fail('BIC invalide (8 ou 11 caractères, ex: BNPAFRPPXXX).')
  return ok
}

// --- Email ---

export function validateEmail(email: string): ValidationResult {
  if (!email) return ok
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail('Adresse email invalide.')
  return ok
}

// --- Téléphone français ---

export function validatePhone(phone: string): ValidationResult {
  if (!phone) return ok
  const digits = phone.replace(/[\s.\-()]/g, '')
  if (!/^(\+33|0033|0)\d{9}$/.test(digits))
    return fail('Numéro de téléphone invalide (10 chiffres ou +33...).')
  return ok
}

// --- Code postal français (5 chiffres, 01-99) ---

export function validatePostalCode(code: string): ValidationResult {
  if (!code) return ok
  if (!/^\d{5}$/.test(code)) return fail('Le code postal doit contenir 5 chiffres.')
  const dept = parseInt(code.slice(0, 2), 10)
  if (dept < 1 || dept > 99) return fail('Code postal invalide.')
  return ok
}

// --- Helper : valider un objet et retourner les erreurs ---

export type FieldErrors = Record<string, string>

export function validateFields(
  validations: Array<{ field: string; result: ValidationResult }>
): FieldErrors {
  const errors: FieldErrors = {}
  for (const { field, result } of validations) {
    if (!result.valid) errors[field] = result.message
  }
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
