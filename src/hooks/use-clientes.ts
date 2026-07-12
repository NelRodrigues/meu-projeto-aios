'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types/database'

// Contactos vivem na tabela `leads` (renomeada de `clientes` na migracao 002).
export function useClientes() {
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refetch manual (chamado por handlers, nunca no render).
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setClientes(data || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // O setState corre dentro do callback .then (nunca no corpo sincrono do effect).
    let activo = true
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) {
          setError(err.message)
        } else {
          setClientes(data || [])
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [supabase])

  const criarCliente = useCallback(async (data: Partial<Cliente>) => {
    const { data: novo, error: err } = await supabase
      .from('leads')
      .insert(data)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => [novo as Cliente, ...prev])
    return novo as Cliente
  }, [supabase])

  const actualizarCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    const { data: updated, error: err } = await supabase
      .from('leads')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => prev.map(c => c.id === id ? updated as Cliente : c))
    return updated as Cliente
  }, [supabase])

  return { clientes, loading, error, fetchClientes, criarCliente, actualizarCliente }
}
