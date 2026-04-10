// ============================================================
// Fiscalité française — TVA, seuils micro-entreprise, URSSAF
// ============================================================

// Seuils micro-entreprise 2026 (article 293 B CGI)
export const MICRO_THRESHOLDS = {
  services: 77_700,        // Prestations de services (BNC/BIC)
  goods: 188_700,          // Vente de marchandises
  services_major: 254_000, // Seuil majoré services (perte franchise TVA)
  goods_major: 840_000,    // Seuil majoré marchandises
} as const

// Taux de TVA en vigueur en France métropolitaine
export const TVA_RATES = {
  normal: 20,       // Taux normal
  intermediaire: 10, // Taux intermédiaire (rénovation, restauration, transport)
  reduit: 5.5,      // Taux réduit (alimentaire, livres, énergie)
  super_reduit: 2.1, // Taux super-réduit (presse, médicaments remboursés)
  zero: 0,           // Exonéré / Export / Auto-entrepreneur
} as const

export type TVARate = typeof TVA_RATES[keyof typeof TVA_RATES]

export const TVA_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 20, label: '20 % — Taux normal' },
  { value: 10, label: '10 % — Taux intermédiaire' },
  { value: 5.5, label: '5,5 % — Taux réduit' },
  { value: 2.1, label: '2,1 % — Taux super-réduit' },
  { value: 0, label: '0 % — Exonéré' },
]

// Mentions légales obligatoires
export const LEGAL_MENTIONS = {
  vat_exempt:
    'TVA non applicable, article 293 B du Code général des impôts.',
  late_penalty: (rate: number) =>
    `En cas de retard de paiement, une pénalité de ${rate} % par mois sera appliquée, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €.`,
  recovery_indemnity:
    'Indemnité forfaitaire pour frais de recouvrement : 40,00 €',
  escompte_none:
    'Pas d\'escompte pour paiement anticipé.',
} as const

// Taux de pénalités de retard (3 × taux BCE, min 10%)
export const LATE_PENALTY_RATE = 12.43 // 2026 — à mettre à jour selon BCE

// Cotisations sociales auto-entrepreneur (URSSAF 2026)
export const URSSAF_RATES = {
  services_bic: 21.1,   // Prestations de services commerciales (BIC)
  services_bnc: 21.1,   // Prestations de services libérales (BNC)
  goods: 12.3,           // Vente de marchandises
  liberal_cipav: 21.2,   // Professions libérales CIPAV
} as const

// Vérifie si un auto-entrepreneur est proche des seuils
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
