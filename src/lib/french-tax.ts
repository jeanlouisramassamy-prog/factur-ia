// ============================================================
// Fiscalité française — TVA, seuils micro, URSSAF, DOM, Octroi de Mer
// ============================================================

import type { Territoire } from './types'

// ─── Seuils micro-entreprise 2026 (article 293 B CGI) ───

export const MICRO_THRESHOLDS = {
  services: 77_700,
  goods: 188_700,
  services_major: 254_000,
  goods_major: 840_000,
} as const

// ─── Taux de TVA par territoire ───

export const TVA_RATES_METROPOLE = {
  normal: 20,
  intermediaire: 10,
  reduit: 5.5,
  super_reduit: 2.1,
  zero: 0,
} as const

export const TVA_RATES_DOM = {
  normal: 8.5,
  intermediaire: 2.1,
  reduit: 2.1,
  super_reduit: 2.1,
  zero: 0,
} as const

export function getTVARates(territoire: Territoire) {
  return territoire === 'dom' ? TVA_RATES_DOM : TVA_RATES_METROPOLE
}

/** Adapte un taux TVA métropole → DOM */
export function adaptTVAForTerritoire(metroRate: number, territoire: Territoire): number {
  if (territoire === 'metropole' || metroRate === 0) return metroRate
  if (metroRate === 20) return TVA_RATES_DOM.normal      // 8.5%
  if (metroRate === 10) return TVA_RATES_DOM.intermediaire // 2.1%
  if (metroRate === 5.5) return TVA_RATES_DOM.reduit       // 2.1%
  if (metroRate === 2.1) return TVA_RATES_DOM.super_reduit // 2.1%
  return metroRate
}

export const TVA_RATE_OPTIONS_METROPOLE: { value: number; label: string }[] = [
  { value: 20, label: '20 % — Taux normal' },
  { value: 10, label: '10 % — Taux intermédiaire' },
  { value: 5.5, label: '5,5 % — Taux réduit' },
  { value: 2.1, label: '2,1 % — Taux super-réduit' },
  { value: 0, label: '0 % — Exonéré' },
]

export const TVA_RATE_OPTIONS_DOM: { value: number; label: string }[] = [
  { value: 8.5, label: '8,5 % — Taux normal DOM' },
  { value: 2.1, label: '2,1 % — Taux réduit DOM' },
  { value: 0, label: '0 % — Exonéré' },
]

export function getTVARateOptions(territoire: Territoire) {
  return territoire === 'dom' ? TVA_RATE_OPTIONS_DOM : TVA_RATE_OPTIONS_METROPOLE
}

// ─── Mentions légales obligatoires ───

export const LEGAL_MENTIONS = {
  vat_exempt:
    'TVA non applicable, article 293 B du Code général des impôts.',
  formation_exempt:
    'Exonération de TVA — Article 261-4-4° du Code Général des Impôts.',
  late_penalty: (rate: number) =>
    `En cas de retard de paiement, une pénalité de ${rate} % par mois sera appliquée, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €.`,
  recovery_indemnity:
    'Indemnité forfaitaire pour frais de recouvrement : 40,00 €',
  escompte_none:
    'Pas d\'escompte pour paiement anticipé.',
  octroi_de_mer_exempt:
    'Exonéré d\'Octroi de Mer — CA < 300 000 €.',
} as const

export const LATE_PENALTY_RATE = 12.43

// ─── Octroi de Mer (DOM uniquement) ───

export const OCTROI_DE_MER_SEUIL = 300_000

export function calculateOctroiDeMer(
  ht: number,
  tauxOM: number | null,
  tauxOMR: number | null,
  assujetti: boolean
): { om: number; omr: number } {
  if (!assujetti || (!tauxOM && !tauxOMR)) return { om: 0, omr: 0 }
  return {
    om: tauxOM ? Math.round(ht * (tauxOM / 100) * 100) / 100 : 0,
    omr: tauxOMR ? Math.round(ht * (tauxOMR / 100) * 100) / 100 : 0,
  }
}

/** En DOM, la TVA est calculée sur HT + Octroi de Mer */
export function calculateTVAWithOM(ht: number, om: number, omr: number, tvaRate: number): number {
  const baseTVA = ht + om + omr
  return Math.round(baseTVA * (tvaRate / 100) * 100) / 100
}

// ─── Cotisations sociales auto-entrepreneur ───

export const URSSAF_RATES = {
  // Métropole
  services_bic: 21.2,
  services_bnc: 21.1,
  goods: 12.3,
  liberal_cipav: 23.2,
  // DOM (hors ACRE)
  services_bic_dom: 12,
  services_bnc_dom: 12,
  goods_dom: 8,
  liberal_cipav_dom: 12,
} as const

// ACRE DOM — exonérations renforcées (3 ans au lieu de 1 en métropole)
export const ACRE_DOM_RATES: Record<number, number> = {
  1: 0,    // Année 1 : exonération totale
  2: 25,   // Année 2 : 75% exonération → paie 25%
  3: 50,   // Année 3 : 50% exonération → paie 50%
}

export function getAcreDomMultiplier(annee: number | null): number {
  if (annee == null || !(annee in ACRE_DOM_RATES)) return 100
  return ACRE_DOM_RATES[annee]
}

// ─── Alertes seuils micro-entreprise ───

export function checkThresholdAlerts(
  servicesHT: number,
  goodsHT: number
): { level: 'ok' | 'warning' | 'danger' | 'exceeded'; message: string }[] {
  const alerts: { level: 'ok' | 'warning' | 'danger' | 'exceeded'; message: string }[] = []

  const checkSeuil = (ca: number, limit: number, label: string) => {
    const percent = (ca / limit) * 100
    if (percent >= 100) {
      alerts.push({
        level: 'exceeded',
        message: `Seuil ${label} dépassé (${Math.round(percent)} %). Vous perdez le régime micro-entreprise.`,
      })
    } else if (percent >= 90) {
      alerts.push({
        level: 'danger',
        message: `Attention : ${Math.round(percent)} % du seuil ${label} atteint.`,
      })
    } else if (percent >= 80) {
      alerts.push({
        level: 'warning',
        message: `${Math.round(percent)} % du seuil ${label} atteint.`,
      })
    }
  }

  if (servicesHT > 0) {
    checkSeuil(servicesHT, MICRO_THRESHOLDS.services, 'services (77 700 €)')
  }
  if (goodsHT > 0) {
    checkSeuil(goodsHT, MICRO_THRESHOLDS.goods, 'marchandises (188 700 €)')
  }

  return alerts
}
