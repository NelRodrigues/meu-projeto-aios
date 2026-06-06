'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode } from '@/lib/backend/config'
import { mapSharedContactToCliente } from '@/lib/backend/shared-mappers'
import type { Cliente } from '@/types/database'

export function useClientes() {
  const supabase = useMemo(() => createClient(), [])
  const sharedMode = isSharedBackendMode()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refetch manual (chamado por handlers, nunca no render).
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from(sharedMode ? 'contacts' : 'clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setClientes(
        sharedMode
          ? (data || []).map((row) => mapSharedContactToCliente(row as Parameters<typeof mapSharedContactToCliente>[0]))
          : data || []
      )
    }

    setLoading(false)
  }, [sharedMode, supabase])

  useEffect(() => {
    // O setState corre dentro do callback .then (nunca no corpo sincrono do effect).
    let activo = true
    supabase
      .from(sharedMode ? 'contacts' : 'clientes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) {
          setError(err.message)
        } else {
          setClientes(
            sharedMode
              ? (data || []).map((row) => mapSharedContactToCliente(row as Parameters<typeof mapSharedContactToCliente>[0]))
              : data || []
          )
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [sharedMode, supabase])

  const criarCliente = useCallback(async (data: Partial<Cliente>) => {
    if (sharedMode) {
      const { data: created, error: err } = await supabase
        .from('contacts')
        .insert({
          nome: data.nome,
          telefone: data.telefone,
          email: data.email,
          estagio: 'lead',
          origem: 'whatsapp',
          notas: data.notas,
          whatsapp_id: data.whatsapp_id,
        })
        .select()
        .single()

      if (err) throw new Error(err.message)
      const mapped = mapSharedContactToCliente(created as Parameters<typeof mapSharedContactToCliente>[0])
      setClientes((prev) => [mapped, ...prev])
      return mapped
    }

    const { data: novo, error: err } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => [novo as Cliente, ...prev])
    return novo as Cliente
  }, [sharedMode, supabase])

  const actualizarCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    if (sharedMode) {
      const { data: updated, error: err } = await supabase
        .from('contacts')
        .update({
          nome: data.nome,
          telefone: data.telefone,
          email: data.email,
          estagio: data.estagio,
          origem: data.origem,
          notas: data.notas,
        })
        .eq('id', id)
        .select()
        .single()

      if (err) throw new Error(err.message)
      const mapped = mapSharedContactToCliente(updated as Parameters<typeof mapSharedContactToCliente>[0])
      setClientes((prev) => prev.map((c) => (c.id === id ? mapped : c)))
      return mapped
    }

    const { data: updated, error: err } = await supabase
      .from('clientes')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => prev.map(c => c.id === id ? updated as Cliente : c))
    return updated as Cliente
  }, [sharedMode, supabase])

  return { clientes, loading, error, fetchClientes, criarCliente, actualizarCliente }
}
