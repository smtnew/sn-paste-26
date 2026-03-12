-- ============================================================
-- Migrare: Permite utilizatorilor autentificați să citească
-- plățile (necesar pentru pagina stats.html)
-- Rulează acest SQL în Supabase SQL Editor (dashboard.supabase.com)
-- ============================================================

CREATE POLICY "payments_select_authenticated"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "campaigns_select_authenticated"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);
