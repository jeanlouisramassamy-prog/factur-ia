-- ============================================================
-- FacturIA — Migration 003 : Fournisseurs & Dépenses
-- Gestion des factures fournisseurs, import Factur-X
-- ============================================================

-- 1. Fournisseurs
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  siret text,
  vat_number text,
  email text,
  phone text,
  address_line1 text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners manage suppliers" ON suppliers
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 2. Dépenses (factures fournisseurs)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id),
  invoice_number text,
  issue_date date NOT NULL,
  due_date date,
  subtotal_ht numeric(12,2) NOT NULL,
  total_tva numeric(12,2) DEFAULT 0,
  total_ttc numeric(12,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'a_payer' CHECK (status IN ('a_payer', 'paye', 'en_litige')),
  source text DEFAULT 'manuel' CHECK (source IN ('manuel', 'facturx_import')),
  fichier_url text,
  xml_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners manage expenses" ON expenses
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 3. Lignes de dépenses
CREATE TABLE expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,3) DEFAULT 1,
  unit_price_ht numeric(12,2) NOT NULL,
  total_ht numeric(12,2) NOT NULL,
  tva_rate numeric(5,2) DEFAULT 20,
  total_tva numeric(12,2),
  pcg_account text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Via expense owner" ON expense_items
  FOR ALL USING (expense_id IN (
    SELECT id FROM expenses WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_suppliers_business ON suppliers(business_id);
CREATE INDEX idx_suppliers_siret ON suppliers(siret);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_supplier ON expenses(supplier_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expense_items_expense ON expense_items(expense_id);
