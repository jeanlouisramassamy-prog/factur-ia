import { describe, it, expect } from 'vitest'
import {
  MICRO_THRESHOLDS,
  TVA_RATES_METROPOLE,
  TVA_RATES_DOM,
  getTVARates,
  adaptTVAForTerritoire,
  calculateOctroiDeMer,
  calculateTVAWithOM,
  getAcreDomMultiplier,
  checkThresholdAlerts,
  LATE_PENALTY_RATE,
  OCTROI_DE_MER_SEUIL,
} from './french-tax'

describe('MICRO_THRESHOLDS', () => {
  it('has correct 2026 thresholds', () => {
    expect(MICRO_THRESHOLDS.services).toBe(77_700)
    expect(MICRO_THRESHOLDS.goods).toBe(188_700)
  })
})

describe('getTVARates', () => {
  it('returns metropole rates', () => {
    expect(getTVARates('metropole')).toBe(TVA_RATES_METROPOLE)
  })

  it('returns DOM rates', () => {
    expect(getTVARates('dom')).toBe(TVA_RATES_DOM)
  })
})

describe('adaptTVAForTerritoire', () => {
  it('keeps rate unchanged for metropole', () => {
    expect(adaptTVAForTerritoire(20, 'metropole')).toBe(20)
    expect(adaptTVAForTerritoire(10, 'metropole')).toBe(10)
  })

  it('converts 20% metro to 8.5% DOM', () => {
    expect(adaptTVAForTerritoire(20, 'dom')).toBe(8.5)
  })

  it('converts 10% metro to 2.1% DOM', () => {
    expect(adaptTVAForTerritoire(10, 'dom')).toBe(2.1)
  })

  it('converts 5.5% metro to 2.1% DOM', () => {
    expect(adaptTVAForTerritoire(5.5, 'dom')).toBe(2.1)
  })

  it('keeps 0% unchanged for DOM', () => {
    expect(adaptTVAForTerritoire(0, 'dom')).toBe(0)
  })

  it('returns unknown rate as-is for DOM', () => {
    expect(adaptTVAForTerritoire(15, 'dom')).toBe(15)
  })
})

describe('calculateOctroiDeMer', () => {
  it('returns 0 when not assujetti', () => {
    expect(calculateOctroiDeMer(1000, 5, 2.5, false)).toEqual({ om: 0, omr: 0 })
  })

  it('returns 0 when no rates', () => {
    expect(calculateOctroiDeMer(1000, null, null, true)).toEqual({ om: 0, omr: 0 })
  })

  it('calculates correctly', () => {
    const result = calculateOctroiDeMer(1000, 5, 2.5, true)
    expect(result.om).toBe(50)
    expect(result.omr).toBe(25)
  })

  it('rounds to 2 decimals', () => {
    const result = calculateOctroiDeMer(33.33, 7, null, true)
    expect(result.om).toBe(2.33) // 33.33 * 0.07 = 2.3331
  })
})

describe('calculateTVAWithOM', () => {
  it('calculates TVA on HT + OM + OMR', () => {
    // base = 1000 + 50 + 25 = 1075
    // TVA 8.5% = 91.375 → 91.38
    expect(calculateTVAWithOM(1000, 50, 25, 8.5)).toBe(91.38)
  })

  it('returns 0 for 0% rate', () => {
    expect(calculateTVAWithOM(1000, 50, 25, 0)).toBe(0)
  })
})

describe('getAcreDomMultiplier', () => {
  it('returns 0 for year 1 (full exemption)', () => {
    expect(getAcreDomMultiplier(1)).toBe(0)
  })

  it('returns 25 for year 2', () => {
    expect(getAcreDomMultiplier(2)).toBe(25)
  })

  it('returns 50 for year 3', () => {
    expect(getAcreDomMultiplier(3)).toBe(50)
  })

  it('returns 100 for null (no ACRE)', () => {
    expect(getAcreDomMultiplier(null)).toBe(100)
  })

  it('returns 100 for year 4+ (ACRE expired)', () => {
    expect(getAcreDomMultiplier(4)).toBe(100)
  })
})

describe('checkThresholdAlerts', () => {
  it('returns no alerts when under 80%', () => {
    const alerts = checkThresholdAlerts(50_000, 100_000)
    expect(alerts).toHaveLength(0)
  })

  it('returns warning at 80%', () => {
    const alerts = checkThresholdAlerts(62_160, 0) // 80% of 77700
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('warning')
  })

  it('returns danger at 90%', () => {
    const alerts = checkThresholdAlerts(69_930, 0) // 90% of 77700
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('danger')
  })

  it('returns exceeded at 100%', () => {
    const alerts = checkThresholdAlerts(77_700, 0)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('exceeded')
  })

  it('checks both services and goods independently', () => {
    const alerts = checkThresholdAlerts(77_700, 188_700)
    expect(alerts).toHaveLength(2)
  })

  it('ignores zero amounts', () => {
    const alerts = checkThresholdAlerts(0, 0)
    expect(alerts).toHaveLength(0)
  })
})

describe('Constants', () => {
  it('has correct late penalty rate', () => {
    expect(LATE_PENALTY_RATE).toBe(12.43)
  })

  it('has correct Octroi de Mer threshold', () => {
    expect(OCTROI_DE_MER_SEUIL).toBe(300_000)
  })
})
