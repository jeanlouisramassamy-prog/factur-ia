// ============================================================
// Catégories fiscales produits/services
// Chaque catégorie détermine : taux TVA, type d'activité (pour seuils micro),
// compte PCG (Plan Comptable Général), et le type URSSAF pour déclaration CA.
// ============================================================

import type { ActivityType } from './types'

export interface ProductCategory {
  id: string
  label: string
  description: string
  examples: string
  tva_rate: number
  activity_type: ActivityType
  pcg_account: string
  urssaf_type: 'services' | 'goods' | 'none'
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  // --- Services (seuil micro : 77 700 €) — PCG 706xxx ---
  {
    id: 'services_general',
    label: 'Prestations de services',
    description: 'Prestations intellectuelles, conseil, développement, design',
    examples: 'Création site web, conseil marketing, formation, coaching',
    tva_rate: 20,
    activity_type: 'service',
    pcg_account: '706000',
    urssaf_type: 'services',
  },
  {
    id: 'services_renovation',
    label: 'Travaux de rénovation',
    description: 'Travaux de rénovation de logements de plus de 2 ans',
    examples: 'Peinture, plomberie, électricité en rénovation',
    tva_rate: 10,
    activity_type: 'service',
    pcg_account: '706100',
    urssaf_type: 'services',
  },
  {
    id: 'services_restauration',
    label: 'Restauration',
    description: 'Restauration sur place (hors boissons alcoolisées)',
    examples: 'Traiteur, restaurant, food-truck',
    tva_rate: 10,
    activity_type: 'service',
    pcg_account: '706200',
    urssaf_type: 'services',
  },
  {
    id: 'services_formation',
    label: 'Formation professionnelle',
    description: 'Formation continue, séminaires, ateliers',
    examples: 'Formation Excel, atelier cuisine, cours de langue',
    tva_rate: 20,
    activity_type: 'service',
    pcg_account: '706300',
    urssaf_type: 'services',
  },
  {
    id: 'services_location',
    label: 'Location de matériel',
    description: 'Location de biens meubles (matériel, véhicules)',
    examples: 'Location matériel photo, outillage, véhicules',
    tva_rate: 20,
    activity_type: 'service',
    pcg_account: '706400',
    urssaf_type: 'services',
  },

  // --- Marchandises (seuil micro : 188 700 €) — PCG 707xxx ---
  {
    id: 'goods_standard',
    label: 'Vente de marchandises',
    description: 'Vente de biens et marchandises au taux normal',
    examples: 'Vêtements, électronique, mobilier, fournitures',
    tva_rate: 20,
    activity_type: 'goods',
    pcg_account: '707000',
    urssaf_type: 'goods',
  },
  {
    id: 'goods_food',
    label: 'Produits alimentaires',
    description: 'Alimentation et boissons non alcoolisées',
    examples: 'Épicerie, boulangerie, produits bio, boissons',
    tva_rate: 5.5,
    activity_type: 'goods',
    pcg_account: '707100',
    urssaf_type: 'goods',
  },
  {
    id: 'goods_books',
    label: 'Livres et édition',
    description: 'Livres imprimés et numériques (ebooks)',
    examples: 'Livres, manuels, ebooks, partitions',
    tva_rate: 5.5,
    activity_type: 'goods',
    pcg_account: '707200',
    urssaf_type: 'goods',
  },
  {
    id: 'goods_energy',
    label: 'Énergie',
    description: 'Abonnements et fournitures d\'énergie',
    examples: 'Électricité, gaz, bois de chauffage',
    tva_rate: 5.5,
    activity_type: 'goods',
    pcg_account: '707300',
    urssaf_type: 'goods',
  },
  {
    id: 'goods_press',
    label: 'Presse et publications',
    description: 'Journaux, magazines, publications périodiques',
    examples: 'Journaux, magazines, newsletters imprimées',
    tva_rate: 2.1,
    activity_type: 'goods',
    pcg_account: '707400',
    urssaf_type: 'goods',
  },
  {
    id: 'goods_pharma',
    label: 'Médicaments remboursés',
    description: 'Médicaments remboursables par la Sécurité sociale',
    examples: 'Médicaments sur ordonnance remboursés',
    tva_rate: 2.1,
    activity_type: 'goods',
    pcg_account: '707500',
    urssaf_type: 'goods',
  },

  // --- Export / Intracommunautaire ---
  {
    id: 'export_hors_ue',
    label: 'Exportation hors UE',
    description: 'Livraisons de biens ou services hors Union européenne',
    examples: 'Vente e-commerce vers les USA, Suisse, UK',
    tva_rate: 0,
    activity_type: 'export',
    pcg_account: '707600',
    urssaf_type: 'goods',
  },
  {
    id: 'intra_eu',
    label: 'Livraison intracommunautaire',
    description: 'Livraisons de biens entre pays de l\'UE (autoliquidation)',
    examples: 'Vente à un professionnel en Allemagne, Espagne',
    tva_rate: 0,
    activity_type: 'export',
    pcg_account: '707700',
    urssaf_type: 'goods',
  },

  // --- Exonéré (auto-entrepreneur) ---
  {
    id: 'exempt_293b',
    label: 'Exonéré TVA (art. 293 B)',
    description: 'Auto-entrepreneur en franchise de TVA',
    examples: 'Toute prestation ou vente en franchise de base',
    tva_rate: 0,
    activity_type: 'exempt',
    pcg_account: '',
    urssaf_type: 'none',
  },
]

// Helpers
export function getCategoryById(id: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((c) => c.id === id)
}

export function getCategoriesByActivityType(type: ActivityType): ProductCategory[] {
  return PRODUCT_CATEGORIES.filter((c) => c.activity_type === type)
}

export function getServiceCategories(): ProductCategory[] {
  return PRODUCT_CATEGORIES.filter((c) => c.activity_type === 'service')
}

export function getGoodsCategories(): ProductCategory[] {
  return PRODUCT_CATEGORIES.filter((c) => c.activity_type === 'goods')
}

// Pour les select/dropdown
export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((c) => ({
  value: c.id,
  label: c.label,
  description: c.description,
  tva_rate: c.tva_rate,
  activity_type: c.activity_type,
}))
