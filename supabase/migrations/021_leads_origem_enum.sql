-- ============================================================================
-- Migração 021 — Alinhar `leads.origem` ao enum `lead_origem` da arquitectura
-- ----------------------------------------------------------------------------
-- Porquê: a migração 002 clonou `leads.origem` da base ISILDA com o CHECK
-- `('instagram','tiktok','whatsapp','indicacao','outro')`. Mas a Arquitectura
-- §2.1 define o enum `lead_origem` do SIC Global Minds com 8 valores, que os
-- consumidores a jusante EXIGEM:
--   • `formulario_site`   — formulário público (story 2.4)
--   • `importacao`        — importação de Excels (story 2.5)
--   • `campanha_email`    — email marketing (E5)
--   • `campanha_whatsapp` — campanhas WhatsApp (E5)
-- Sem este alinhamento, o formulário público e a importação teriam de mascarar
-- a origem real (ex.: `origem='outro'`), corrompendo o relatório de origem de
-- leads (FR21). `tiktok` (herdado da ISILDA) NÃO consta do enum da arquitectura —
-- é removido do CHECK; nenhum lead da GM usa tiktok (base vazia).
--
-- Enum final (§2.1): whatsapp, formulario_site, instagram, indicacao,
--                    campanha_email, campanha_whatsapp, importacao, outro.
--
-- Fonte: Arquitectura §2.1 (lead_origem). Corrige o clone da 002.
-- ============================================================================

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_origem_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_origem_check CHECK (origem IN (
    'whatsapp',
    'formulario_site',
    'instagram',
    'indicacao',
    'campanha_email',
    'campanha_whatsapp',
    'importacao',
    'outro'
  ));

-- ============================================================================
-- ROLLBACK:
--   ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_origem_check;
--   ALTER TABLE public.leads
--     ADD CONSTRAINT leads_origem_check CHECK (origem IN
--       ('instagram','tiktok','whatsapp','indicacao','outro'));
-- ============================================================================
