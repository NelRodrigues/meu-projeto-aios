-- ============================================================
-- Script de Import — Contactos da Porcelana Beauty (Story 1.4)
-- SIC GERAL · schema porcelana · ADR-004
-- ============================================================
-- PIPELINE: CSV → staging → normalização E.164 → dedup → upsert idempotente
-- Executar via service_role (RLS de porcelana.contacts é só SELECT p/ authenticated).
-- Re-executável (idempotente por phone_e164).
--
-- PRÉ-REQUISITO: os CSVs do cliente carregados na tabela de staging abaixo.
--   (carregar via \copy do psql, ou papaparse no frontend, ou COPY).
-- ============================================================

-- ------------------------------------------------------------
-- 1. STAGING (todas as colunas TEXT — dados crus do CSV)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS porcelana._import_staging (
  linha_id BIGSERIAL PRIMARY KEY,
  nome_completo TEXT,
  telefone TEXT,
  email TEXT,
  instagram TEXT,
  origem TEXT,
  notas TEXT,
  importado_em TIMESTAMPTZ DEFAULT now()
);

-- Carregar os CSVs (exemplo — ajustar caminho):
--   \copy porcelana._import_staging (nome_completo,telefone,email,instagram,origem,notas)
--     FROM 'contactos-porcelana.csv' WITH (FORMAT csv, HEADER true);

-- ------------------------------------------------------------
-- 2. FUNÇÃO: normalizar telefone para E.164 (Angola +244)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION porcelana.normalize_phone_ao(p_raw TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v TEXT;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;
  -- remover tudo excepto dígitos
  v := regexp_replace(p_raw, '[^0-9]', '', 'g');
  IF v = '' THEN RETURN NULL; END IF;
  -- já tem indicativo 244
  IF left(v,3) = '244' THEN
    RETURN '+' || v;
  END IF;
  -- número local angolano (9 dígitos, começa por 9)
  IF length(v) = 9 AND left(v,1) = '9' THEN
    RETURN '+244' || v;
  END IF;
  -- caso com 0 à frente (0 9XX...) → remover o 0
  IF length(v) = 10 AND left(v,2) = '09' THEN
    RETURN '+244' || substring(v from 2);
  END IF;
  -- fallback: devolver com + (revisão manual via relatório)
  RETURN '+' || v;
END;
$fn$;

-- ------------------------------------------------------------
-- 3. RELATÓRIO DE CONFLITOS (rodar ANTES do upsert — revisão humana)
--    Mesmo telefone normalizado, nomes diferentes → conflito
-- ------------------------------------------------------------
-- SELECT phone, array_agg(DISTINCT nome_completo) AS nomes, count(*) AS ocorrencias
-- FROM (
--   SELECT porcelana.normalize_phone_ao(telefone) AS phone, nome_completo
--   FROM porcelana._import_staging WHERE telefone IS NOT NULL
-- ) s
-- GROUP BY phone
-- HAVING count(DISTINCT nome_completo) > 1
-- ORDER BY ocorrencias DESC;

-- ------------------------------------------------------------
-- 4. UPSERT idempotente → porcelana.contacts
--    dedup por phone_e164 (constraint contacts_phone_unique)
-- ------------------------------------------------------------
INSERT INTO porcelana.contacts (
  full_name, phone_e164, email, instagram_handle,
  acquisition_source, inferred_city, metadata
)
SELECT DISTINCT ON (porcelana.normalize_phone_ao(s.telefone))
  NULLIF(trim(s.nome_completo), ''),
  porcelana.normalize_phone_ao(s.telefone),
  NULLIF(trim(s.email), ''),
  NULLIF(trim(s.instagram), ''),
  'import_' || COALESCE(NULLIF(trim(s.origem), ''), 'desconhecido'),
  'Luanda',
  jsonb_build_object(
    'import_origem', COALESCE(s.origem, 'desconhecido'),
    'import_notas', s.notas,
    'consent_status', 'pending_first_contact'   -- FR28: confirmar no 1º contacto
  )
FROM porcelana._import_staging s
WHERE porcelana.normalize_phone_ao(s.telefone) IS NOT NULL
ORDER BY porcelana.normalize_phone_ao(s.telefone), s.linha_id
ON CONFLICT (phone_e164) DO UPDATE SET
  full_name = COALESCE(porcelana.contacts.full_name, EXCLUDED.full_name),
  email     = COALESCE(porcelana.contacts.email, EXCLUDED.email),
  instagram_handle = COALESCE(porcelana.contacts.instagram_handle, EXCLUDED.instagram_handle),
  metadata  = porcelana.contacts.metadata || EXCLUDED.metadata,
  updated_at = now();

-- ------------------------------------------------------------
-- 5. VERIFICAÇÃO pós-import
-- ------------------------------------------------------------
-- SELECT count(*) AS total_importados FROM porcelana.contacts;
-- SELECT count(*) AS na_staging FROM porcelana._import_staging;
-- SELECT count(DISTINCT porcelana.normalize_phone_ao(telefone)) AS unicos_esperados
--   FROM porcelana._import_staging WHERE telefone IS NOT NULL;

-- ------------------------------------------------------------
-- 6. LIMPEZA (opcional, após confirmar import)
-- ------------------------------------------------------------
-- DROP TABLE porcelana._import_staging;
