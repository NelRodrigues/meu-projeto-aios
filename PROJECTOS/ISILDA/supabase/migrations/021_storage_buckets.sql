INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('portfolio', 'portfolio', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('comprovativos', 'comprovativos', false, 5242880, ARRAY['image/jpeg','image/png','application/pdf']),
  ('vision', 'vision', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('media', 'media', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','audio/ogg','audio/mpeg','video/mp4'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Portfolio publico para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Autenticados podem fazer upload ao portfolio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio');
CREATE POLICY "Autenticados podem actualizar portfolio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio');
CREATE POLICY "Admin pode apagar portfolio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Autenticados podem ver comprovativos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovativos');
CREATE POLICY "Service role gere comprovativos" ON storage.objects FOR ALL TO service_role
  USING (bucket_id IN ('comprovativos', 'vision', 'media')) WITH CHECK (bucket_id IN ('comprovativos', 'vision', 'media'));

CREATE POLICY "Autenticados podem ver media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('vision', 'media'));
