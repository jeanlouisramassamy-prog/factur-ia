-- ============================================================
-- FacturIA — Migration 002 : Catégorisation étendue + DOM
-- Produits finis (PCG 701), formations, DOM, Octroi de Mer
-- ============================================================

-- 1. Businesses — territoire & options DOM/formation
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS territoire text DEFAULT 'metropole'
  CHECK (territoire IN ('metropole', 'dom'));
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS assujetti_octroi_de_mer boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS acre_dom_annee int;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS exoneration_tva_formation boolean DEFAULT false;

-- 2. Products — formation, stock, octroi de mer
ALTER TABLE products ADD COLUMN IF NOT EXISTS est_formation boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS duree_heures numeric(6,1);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gestion_stock boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS code_nce text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS taux_octroi_de_mer numeric(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS taux_octroi_de_mer_regional numeric(5,2);

-- 3. Invoice items — étendre activity_type + Octroi de Mer
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_activity_type_check;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_activity_type_check
  CHECK (activity_type IN ('service', 'goods', 'produit_fini', 'formation', 'export', 'exempt'));
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS octroi_de_mer numeric(12,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS octroi_de_mer_regional numeric(12,2) DEFAULT 0;

-- 4. Quote items — idem
ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS quote_items_activity_type_check;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_activity_type_check
  CHECK (activity_type IN ('service', 'goods', 'produit_fini', 'formation', 'export', 'exempt'));
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS octroi_de_mer numeric(12,2) DEFAULT 0;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS octroi_de_mer_regional numeric(12,2) DEFAULT 0;
