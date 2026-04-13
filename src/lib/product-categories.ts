// ============================================================
// Catégories fiscales produits/services
// 5 familles : services, marchandises, produits finis, formations, export/exempt
// Chaque catégorie détermine : taux TVA, type d'activité, compte PCG,
// gestion stock, type URSSAF pour déclaration CA.
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
  gestion_stock: boolean
  compte_stock: string | null
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  // ─── SERVICES (seuil micro : 77 700 €) — PCG 706xxx ───

  {
    id: 'prestation_generale',
    label: 'Prestation de service',
    description: 'Prestations intellectuelles, conseil, développement, design',
    examples: 'Création site web, conseil marketing, coaching, rédaction',
    tva_rate: 20,
    activity_type: 'service',
    pcg_account: '706000',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },
  {
    id: 'prestation_renovation',
    label: 'Travaux de rénovation',
    description: 'Travaux de rénovation de logements de plus de 2 ans',
    examples: 'Peinture, plomberie, électricité en rénovation',
    tva_rate: 10,
    activity_type: 'service',
    pcg_account: '706100',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },
  {
    id: 'prestation_restauration',
    label: 'Restauration',
    description: 'Restauration sur place (hors boissons alcoolisées)',
    examples: 'Traiteur, restaurant, food-truck',
    tva_rate: 10,
    activity_type: 'service',
    pcg_account: '706200',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },
  {
    id: 'prestation_location',
    label: 'Location de matériel',
    description: 'Location de biens meubles (matériel, véhicules)',
    examples: 'Location matériel photo, outillage, véhicules',
    tva_rate: 20,
    activity_type: 'service',
    pcg_account: '706400',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },

  // ─── MARCHANDISES (seuil micro : 188 700 €) — PCG 707xxx ───

  {
    id: 'marchandise_standard',
    label: 'Vente de marchandises',
    description: 'Biens physiques revendus en l\'état, sans transformation',
    examples: 'Consommables, résines, filaments, accessoires, pièces détachées',
    tva_rate: 20,
    activity_type: 'goods',
    pcg_account: '707000',
    urssaf_type: 'goods',
    gestion_stock: true,
    compte_stock: '371000',
  },
  {
    id: 'marchandise_alimentaire',
    label: 'Produits alimentaires',
    description: 'Alimentation et boissons non alcoolisées',
    examples: 'Épicerie, boulangerie, produits bio, boissons',
    tva_rate: 5.5,
    activity_type: 'goods',
    pcg_account: '707100',
    urssaf_type: 'goods',
    gestion_stock: true,
    compte_stock: '371000',
  },
  {
    id: 'marchandise_livres',
    label: 'Livres et édition',
    description: 'Livres imprimés et numériques (ebooks)',
    examples: 'Livres, manuels, ebooks, partitions',
    tva_rate: 5.5,
    activity_type: 'goods',
    pcg_account: '707200',
    urssaf_type: 'goods',
    gestion_stock: true,
    compte_stock: '371000',
  },
  {
    id: 'marchandise_presse',
    label: 'Presse et publications',
    description: 'Journaux, magazines, publications périodiques',
    examples: 'Journaux, magazines, newsletters imprimées',
    tva_rate: 2.1,
    activity_type: 'goods',
    pcg_account: '707400',
    urssaf_type: 'goods',
    gestion_stock: true,
    compte_stock: '371000',
  },

  // ─── PRODUITS FINIS (fabriqués par l'entreprise) — PCG 701xxx ───

  {
    id: 'produit_fini',
    label: 'Produit fabriqué',
    description: 'Bien physique fabriqué ou transformé par l\'entreprise avant vente',
    examples: 'Pièces imprimées 3D catalogue, produits manufacturés, prototypes, séries',
    tva_rate: 20,
    activity_type: 'produit_fini',
    pcg_account: '701000',
    urssaf_type: 'goods',
    gestion_stock: true,
    compte_stock: '355000',
  },

  // ─── FORMATIONS — PCG 7064 ───

  {
    id: 'formation_tva',
    label: 'Formation (avec TVA)',
    description: 'Formation professionnelle soumise à la TVA',
    examples: 'Formations techniques, ateliers, webinaires payants, cours',
    tva_rate: 20,
    activity_type: 'formation',
    pcg_account: '706400',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },
  {
    id: 'formation_exo',
    label: 'Formation (exo TVA)',
    description: 'Formation exonérée de TVA — organisme déclaré DREETS (art. 261-4-4° CGI)',
    examples: 'Formations avec numéro d\'activité DREETS, financement OPCO',
    tva_rate: 0,
    activity_type: 'formation',
    pcg_account: '706400',
    urssaf_type: 'services',
    gestion_stock: false,
    compte_stock: null,
  },

  // ─── EXPORT / INTRACOMMUNAUTAIRE ───

  {
    id: 'export_hors_ue',
    label: 'Exportation hors UE',
    description: 'Livraisons de biens ou services hors Union européenne',
    examples: 'Vente e-commerce vers les USA, Suisse, UK',
    tva_rate: 0,
    activity_type: 'export',
    pcg_account: '707600',
    urssaf_type: 'goods',
    gestion_stock: false,
    compte_stock: null,
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
    gestion_stock: false,
    compte_stock: null,
  },

  // ─── EXONÉRÉ (auto-entrepreneur) ───

  {
    id: 'exempt_293b',
    label: 'Exonéré TVA (art. 293 B)',
    description: 'Auto-entrepreneur en franchise de TVA',
    examples: 'Toute prestation ou vente en franchise de base',
    tva_rate: 0,
    activity_type: 'exempt',
    pcg_account: '',
    urssaf_type: 'none',
    gestion_stock: false,
    compte_stock: null,
  },
]

// ─── Helpers ───

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

export function getProduitFiniCategories(): ProductCategory[] {
  return PRODUCT_CATEGORIES.filter((c) => c.activity_type === 'produit_fini')
}

export function getFormationCategories(): ProductCategory[] {
  return PRODUCT_CATEGORIES.filter((c) => c.activity_type === 'formation')
}

// Pour les select/dropdown — groupé par famille
export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((c) => ({
  value: c.id,
  label: c.label,
  description: c.description,
  tva_rate: c.tva_rate,
  activity_type: c.activity_type,
  gestion_stock: c.gestion_stock,
}))

// Badges par nature
export const ACTIVITY_BADGES: Record<ActivityType, { label: string; color: string }> = {
  service: { label: 'Service', color: 'bg-blue-100 text-blue-700' },
  goods: { label: 'Marchandise', color: 'bg-green-100 text-green-700' },
  produit_fini: { label: 'Produit fini', color: 'bg-purple-100 text-purple-700' },
  formation: { label: 'Formation', color: 'bg-amber-100 text-amber-700' },
  export: { label: 'Export', color: 'bg-cyan-100 text-cyan-700' },
  exempt: { label: 'Exonéré', color: 'bg-gray-100 text-gray-600' },
}
