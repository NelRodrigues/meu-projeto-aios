-- Migration 017: Checklist Diaria

CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0 NOT NULL,
  activo BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  task_id UUID NOT NULL REFERENCES public.checklist_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  completado_em DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX idx_checklist_completions_unique ON public.checklist_completions(task_id, completado_em);
CREATE INDEX idx_checklist_completions_date ON public.checklist_completions(completado_em);

-- RLS
ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver tasks" ON public.checklist_tasks
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir completions" ON public.checklist_completions
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
