-- Migration 026: Seed Checklist Diaria

INSERT INTO public.checklist_tasks (titulo, descricao, ordem) VALUES
(
  'Verificar mensagens pendentes',
  'Abrir o Inbox e responder a conversas que precisam de atenção humana',
  1
),
(
  'Confirmar entregas de hoje',
  'Verificar o calendário e contactar clientes com entrega marcada para hoje',
  2
),
(
  'Verificar pagamentos pendentes',
  'Confirmar ou rejeitar comprovativos de pagamento recebidos',
  3
),
(
  'Actualizar estados de produção',
  'Mover pedidos em produção para o estado correcto no Kanban',
  4
),
(
  'Publicar conteudo nas redes',
  'Partilhar foto de trabalho do dia no Instagram/WhatsApp Status',
  5
);
