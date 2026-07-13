-- ============================================================================
-- Migração 022 — Storage privado para documentos da ficha de estudante (story 2.4)
-- ----------------------------------------------------------------------------
-- ⚠ GATE: NÃO APLICAR sem coordenação (o brief da story 2.4 deixa o upload real
-- e a criação do bucket como gate humano — aplicação a cargo do coordenador).
--
-- Porquê: o AC2 permite anexar o ficheiro do documento (passaporte, certificado…)
-- à checklist (`fichas_estudante.documentos[].url`). Os documentos são dados
-- pessoais sensíveis (§8) — o bucket TEM de ser privado e o acesso restrito a
-- utilizadores autenticados (a app serve URLs assinadas de curta duração).
--
-- Enquanto esta migração não for aplicada, a UI mantém o campo `url` editável
-- (colar link externo / placeholder) — degradação graciosa, sem upload real.
--
-- Fonte: Arquitectura §8 (segurança / dados sensíveis), story 2.4 AC2.
-- ============================================================================

-- ── Bucket privado ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-estudante', 'documentos-estudante', false)
ON CONFLICT (id) DO NOTHING;

-- ── Políticas RLS do bucket (só autenticados) ────────────────────────────────
-- Leitura: autenticado (a app gera signed URLs; nunca públicas).
CREATE POLICY "documentos_estudante_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-estudante');

-- Upload: autenticado.
CREATE POLICY "documentos_estudante_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-estudante');

-- Actualização/substituição: autenticado.
CREATE POLICY "documentos_estudante_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos-estudante')
  WITH CHECK (bucket_id = 'documentos-estudante');

-- Remoção: só admin activo (defesa em profundidade sobre dados sensíveis).
CREATE POLICY "documentos_estudante_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-estudante'
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active
    )
  );

-- ============================================================================
-- ROLLBACK:
--   DROP POLICY IF EXISTS "documentos_estudante_delete" ON storage.objects;
--   DROP POLICY IF EXISTS "documentos_estudante_update" ON storage.objects;
--   DROP POLICY IF EXISTS "documentos_estudante_insert" ON storage.objects;
--   DROP POLICY IF EXISTS "documentos_estudante_read"   ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'documentos-estudante';
-- ============================================================================
