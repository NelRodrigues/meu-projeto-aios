// ============================================================
// SIC Global Minds — Agregador de timeline unificada (story 2.4 AC3)
// ------------------------------------------------------------
// Junta os eventos de 3 fontes (interacoes, mudancas_estagio,
// mensagens_whatsapp) do mesmo lead numa lista única, ordenada
// cronologicamente (mais recente primeiro). O tipo de evento é discriminado
// por `fonte`, o que mantém a UI extensível: quando os emails (E5) entrarem,
// basta acrescentar mais uma fonte a `agregarTimeline` — o componente que
// consome `EventoTimeline[]` não precisa de mudar.
// ============================================================

// ── Tipo discriminado do evento unificado ────────────────────────────────
export type FonteEvento =
  | 'interacao'
  | 'mudanca_estagio'
  | 'mensagem_whatsapp'
  | 'email' // reservado para E5 — a fonte entra sem reescrever o consumidor

export interface EventoTimeline {
  /** id único no formato `${fonte}:${idOriginal}` (estável para keys de React). */
  id: string
  fonte: FonteEvento
  /** ISO timestamp usado para ordenação. */
  timestamp: string
  /** rótulo curto do tipo de evento (ex.: "nota", "mensagem recebida"). */
  titulo: string
  /** corpo do evento (conteúdo da mensagem/nota, ou descrição da mudança). */
  descricao: string
  /** metadados livres por fonte (direction, sender_type, fase, etc.). */
  meta?: Record<string, unknown>
}

// ── Formas mínimas das linhas de cada fonte (só o que o agregador lê) ──────
export interface InteracaoRow {
  id: string
  created_at: string
  tipo: string | null
  conteudo: string | null
}

export interface MudancaEstagioRow {
  id: string
  created_at: string
  estagio_anterior: string | null
  estagio_novo: string | null
}

export interface MensagemWhatsAppRow {
  id: string
  created_at: string
  sender_type: string | null
  conteudo: string | null
  direction: string | null
}

// ── Mapeadores por fonte (isolados → fáceis de testar e estender) ─────────

function mapInteracao(row: InteracaoRow): EventoTimeline {
  return {
    id: `interacao:${row.id}`,
    fonte: 'interacao',
    timestamp: row.created_at,
    titulo: row.tipo ? `Interacção · ${row.tipo}` : 'Interacção',
    descricao: row.conteudo ?? '',
    meta: { tipo: row.tipo },
  }
}

function mapMudancaEstagio(row: MudancaEstagioRow): EventoTimeline {
  const de = row.estagio_anterior ?? '—'
  const para = row.estagio_novo ?? '—'
  return {
    id: `mudanca_estagio:${row.id}`,
    fonte: 'mudanca_estagio',
    timestamp: row.created_at,
    titulo: 'Mudança de fase',
    descricao: `${de} → ${para}`,
    meta: { estagio_anterior: row.estagio_anterior, estagio_novo: row.estagio_novo },
  }
}

function mapMensagemWhatsApp(row: MensagemWhatsAppRow): EventoTimeline {
  const recebida = row.direction === 'incoming'
  return {
    id: `mensagem_whatsapp:${row.id}`,
    fonte: 'mensagem_whatsapp',
    timestamp: row.created_at,
    titulo: recebida ? 'Mensagem recebida' : 'Mensagem enviada',
    descricao: row.conteudo ?? '',
    meta: { sender_type: row.sender_type, direction: row.direction },
  }
}

// ── Entrada do agregador ──────────────────────────────────────────────────
export interface FontesTimeline {
  interacoes?: InteracaoRow[] | null
  mudancasEstagio?: MudancaEstagioRow[] | null
  mensagensWhatsApp?: MensagemWhatsAppRow[] | null
}

/**
 * Agrega as fontes numa lista única ordenada do mais recente para o mais antigo.
 * Qualquer fonte ausente/nula é ignorada sem quebrar (degradação graciosa).
 */
export function agregarTimeline(fontes: FontesTimeline): EventoTimeline[] {
  const eventos: EventoTimeline[] = [
    ...(fontes.interacoes ?? []).map(mapInteracao),
    ...(fontes.mudancasEstagio ?? []).map(mapMudancaEstagio),
    ...(fontes.mensagensWhatsApp ?? []).map(mapMensagemWhatsApp),
  ]

  return eventos.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime()
    const tb = new Date(b.timestamp).getTime()
    return tb - ta // desc: mais recente primeiro
  })
}
