-- ============================================================
-- FacturIA — Migration initiale
-- Tables, RLS, fonctions, triggers
-- ============================================================

-- 1. Profiles (extension de auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 2. Businesses
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  siret text CHECK (siret IS NULL OR length(siret) = 14),
  siren text GENERATED ALWAYS AS (CASE WHEN siret IS NOT NULL THEN left(siret, 9) ELSE NULL END) STORED,
  legal_form text NOT NULL DEFAULT 'auto_entrepreneur'
    CHECK (legal_form IN ('auto_entrepreneur', 'ei', 'eurl', 'sasu', 'sarl', 'sas', 'sa')),
  vat_number text,
  is_vat_exempt boolean DEFAULT true,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  phone text,
  email text,
  website text,
  logo_url text,
  iban text,
  bic text,
  payment_terms_days int DEFAULT 30,
  default_payment_method text DEFAULT 'virement',
  invoice_prefix text DEFAULT 'FA',
  quote_prefix text DEFAULT 'DE',
  next_invoice_number int DEFAULT 1,
  next_quote_number int DEFAULT 1,
  fiscal_year_start int DEFAULT 1,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'pro')),
  plan_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage their businesses" ON businesses
  FOR ALL USING (auth.uid() = owner_id);

-- 3. Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  siret text,
  vat_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage clients" ON clients
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 4. Products (catalogue avec catégorisation fiscale)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  unit text DEFAULT 'unité',
  default_price_ht numeric(12,2),
  default_tva_rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage products" ON products
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 5. Invoices
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  invoice_number text NOT NULL,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  subtotal_ht numeric(12,2) DEFAULT 0,
  total_tva numeric(12,2) DEFAULT 0,
  total_ttc numeric(12,2) DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  notes text,
  payment_method text,
  paid_at timestamptz,
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  pdf_url text,
  facturx_xml text,
  facturx_profile text DEFAULT 'MINIMUM'
    CHECK (facturx_profile IN ('MINIMUM', 'BASIC', 'EN16931')),
  einvoice_status text DEFAULT 'none'
    CHECK (einvoice_status IN ('none', 'generated', 'sent_ppf', 'accepted', 'rejected')),
  ppf_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage invoices" ON invoices
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 6. Invoice items
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  quantity numeric(10,3) DEFAULT 1,
  unit text DEFAULT 'unité',
  unit_price_ht numeric(12,2) NOT NULL,
  tva_rate numeric(5,2) DEFAULT 0,
  category text NOT NULL DEFAULT 'services_general',
  activity_type text NOT NULL DEFAULT 'service'
    CHECK (activity_type IN ('service', 'goods', 'export', 'exempt')),
  pcg_account text,
  total_ht numeric(12,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price_ht, 2)) STORED,
  total_ttc numeric(12,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price_ht * (1 + tva_rate / 100), 2)) STORED,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Via invoice owner" ON invoice_items
  FOR ALL USING (invoice_id IN (
    SELECT id FROM invoices WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  ));

-- 7. Quotes
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  quote_number text NOT NULL,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'invoiced')),
  issue_date date DEFAULT CURRENT_DATE,
  validity_days int DEFAULT 30,
  subtotal_ht numeric(12,2) DEFAULT 0,
  total_tva numeric(12,2) DEFAULT 0,
  total_ttc numeric(12,2) DEFAULT 0,
  notes text,
  converted_invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_id, quote_number)
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage quotes" ON quotes
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 8. Quote items
CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  quantity numeric(10,3) DEFAULT 1,
  unit text DEFAULT 'unité',
  unit_price_ht numeric(12,2) NOT NULL,
  tva_rate numeric(5,2) DEFAULT 0,
  category text NOT NULL DEFAULT 'services_general',
  activity_type text NOT NULL DEFAULT 'service'
    CHECK (activity_type IN ('service', 'goods', 'export', 'exempt')),
  pcg_account text,
  total_ht numeric(12,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price_ht, 2)) STORED,
  total_ttc numeric(12,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price_ht * (1 + tva_rate / 100), 2)) STORED,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Via quote owner" ON quote_items
  FOR ALL USING (quote_id IN (
    SELECT id FROM quotes WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_clients_business ON clients(business_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_quotes_business ON quotes(business_id);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
