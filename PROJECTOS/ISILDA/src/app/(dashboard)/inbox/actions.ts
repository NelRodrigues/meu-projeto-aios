'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assumirConversaAction(conversaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ai_agent_conversations')
    .update({
      status: 'paused_by_human',
      paused_at: new Date().toISOString(),
      pause_reason: 'Isi assumiu a conversa',
    })
    .eq('id', conversaId)

  if (error) throw new Error(`Falha ao assumir conversa: ${error.message}`)

  revalidatePath('/inbox')
}

export async function devolverAoBotAction(conversaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ai_agent_conversations')
    .update({
      status: 'active',
      paused_by: null,
      pause_reason: null,
      paused_at: null,
    })
    .eq('id', conversaId)

  if (error) throw new Error(`Falha ao devolver ao bot: ${error.message}`)

  revalidatePath('/inbox')
}
